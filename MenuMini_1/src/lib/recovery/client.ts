import {UUID} from '$lib/workspace/model';
import type {RecoveryDomain,RecoveryIdentity,RecoveryCommand,RecoveryDescriptor,RecoveryReceipt} from './model';
import {validateRecoveryBody} from './model';
export class RecoveryError extends Error{constructor(message:string,public notSent=false){super(message);}}
export interface JournalRecord extends RecoveryDescriptor{id:string;version:1;createdAt:string;digest:string;iv:string;ciphertext:string}
export interface RecoveryStorage{load(id:string):Promise<JournalRecord|null>;insert(record:JournalRecord):Promise<JournalRecord>;remove(id:string,key:string):Promise<void>}
export interface RecoveryTransport{check(descriptor:RecoveryDescriptor,cancel:boolean):Promise<RecoveryReceipt>}
export interface RecoverySnapshot{ready:boolean;blocked:boolean;working:boolean;record:(RecoveryDescriptor&{createdAt:string})|null;body:Record<string,unknown>|null;receipt:RecoveryReceipt|null;error:string}
const encoder=new TextEncoder();
const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
const bytes64=(bytes:Uint8Array)=>{let value='';for(let n=0;n<bytes.length;n+=8192)value+=String.fromCharCode(...bytes.slice(n,n+8192));return btoa(value);};
const from64=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const digest=async(v:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(v)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const aad=(r:JournalRecord)=>encoder.encode(canonical({id:r.id,version:r.version,domain:r.domain,operation:r.operation,resourceId:r.resourceId,requestKey:r.requestKey,createdAt:r.createdAt,digest:r.digest}));
export const RECOVERY_DATABASE='menumini-command-recovery-v1';
export function hasSavedRecovery():Promise<boolean>{return new Promise((resolve,reject)=>{
 const r=indexedDB.open(RECOVERY_DATABASE,1);r.onupgradeneeded=()=>r.result.createObjectStore('pending',{keyPath:'id'});r.onerror=r.onblocked=()=>reject(new Error('Recovery storage unavailable.'));
 r.onsuccess=()=>{const db=r.result,tx=db.transaction('pending','readonly'),count=tx.objectStore('pending').count();count.onsuccess=()=>resolve(count.result>0);count.onerror=()=>reject(new Error('Recovery storage unavailable.'));tx.oncomplete=tx.onabort=()=>db.close();};
});}
export function indexedRecoveryStorage():RecoveryStorage{
 function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const request=indexedDB.open(RECOVERY_DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('pending',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Recovery storage is unavailable.'));request.onblocked=()=>reject(new Error('Close another MenuMini tab before opening recovery storage.'));
 });}
 async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
  const db=await open();return new Promise((resolve,reject)=>{
   let tx:IDBTransaction;try{tx=db.transaction('pending',mode,{durability:'strict'});}catch{tx=db.transaction('pending',mode);}
   let value:T;tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=tx.onerror=()=>{db.close();reject(new Error('Recovery storage did not save.'));};
   try{action(tx.objectStore('pending'),v=>{value=v;});}catch(e){tx.abort();db.close();reject(e);}
  });
 }
 return{
  load:id=>transaction<JournalRecord|null>('readonly',(store,done)=>{const r=store.get(id);r.onsuccess=()=>done(r.result||null);}),
  insert:record=>transaction<JournalRecord>('readwrite',(store,done)=>{const r=store.get(record.id);r.onsuccess=()=>{if(r.result)done(r.result);else{store.add(record);done(record);}};}),
  remove:(id,key)=>transaction<void>('readwrite',(store,done)=>{const r=store.get(id);r.onsuccess=()=>{if(r.result?.requestKey!==key){done();return;}store.delete(id);done();};})
 };
}
export function httpRecoveryTransport(domain:RecoveryDomain,branchId:string,csrf:()=>string):RecoveryTransport{return{async check(d,cancel){
 const target=encodeURIComponent(d.resourceId),key=encodeURIComponent(d.requestKey);
 const path=domain==='GUEST'?'/guest/visits/'+target+'/order-requests/'+key:domain==='PAYER'?'/payer/bills/'+target+'/payment-requests/'+key:'/merchant/branches/'+encodeURIComponent(branchId)+'/'+(domain==='SERVICE'?'service':'cashier')+'-requests/'+key;
 const url=new URL('/api/v2'+path+(cancel?'/cancellation':''),location.origin);
 const descriptor={operation:d.operation,resourceId:d.resourceId};
 if(!cancel&&['SERVICE','CASHIER'].includes(domain))for(const [k,v]of Object.entries(descriptor))url.searchParams.set(k,v);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetch(url,{method:cancel?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json',...(cancel?{'Content-Type':'application/json','X-CSRF-Token':csrf(),'Idempotency-Key':d.requestKey}:{})},...(cancel?{body:JSON.stringify(['GUEST','PAYER'].includes(domain)?{}:descriptor)}:{})});
  let value;try{value=await r.json();}catch{throw new RecoveryError('The original result is still unconfirmed. Keep its request key.');}
  if(!r.ok)throw new RecoveryError(value.detail||'Original access is needed to resolve this request. Ask staff for help.');return value as RecoveryReceipt;
 }catch(e){if(e instanceof RecoveryError)throw e;throw new RecoveryError('Connection interrupted. This does not confirm whether the original request saved.');}finally{clearTimeout(timer);}
}};}
export class CommandRecovery{
 private state:RecoverySnapshot={ready:false,blocked:true,working:false,record:null,body:null,receipt:null,error:''};
 private listeners=new Set<(v:RecoverySnapshot)=>void>();private id='';private key:CryptoKey|null=null;private integrityKey:CryptoKey|null=null;private initialization:Promise<void>|null=null;private record:JournalRecord|null=null;private channel:BroadcastChannel|null=null;
 constructor(public domain:RecoveryDomain,private identity:RecoveryIdentity,private transport:RecoveryTransport,private runner:(command:RecoveryCommand)=>Promise<unknown>,private storage:RecoveryStorage=indexedRecoveryStorage()){}
 subscribe(listener:(v:RecoverySnapshot)=>void){this.listeners.add(listener);listener(this.snapshot());return()=>{this.listeners.delete(listener);};}
 snapshot(){return structuredClone(this.state);}
 private emit(update:Partial<RecoverySnapshot>){this.state={...this.state,...update};this.listeners.forEach(f=>f(this.snapshot()));}
 async initialize(retry=false):Promise<void>{
  if(retry&&!this.state.working)this.initialization=null;
  if(!this.initialization)this.initialization=(async()=>{
   try{
    if(!this.identity.scope||!this.identity.secret||!crypto.subtle)throw new Error('Current verified session recovery is unavailable.');
    this.id=await digest('menumini-recovery-v1:'+this.domain+':'+this.identity.scope);
    const material=await crypto.subtle.importKey('raw',encoder.encode(this.identity.secret),'HKDF',false,['deriveKey']);
    this.key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:encoder.encode(this.id),info:encoder.encode('menumini-pending-body-v1')},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    this.integrityKey=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:encoder.encode(this.id),info:encoder.encode('menumini-pending-integrity-v1')},material,{name:'HMAC',hash:'SHA-256',length:256},false,['sign']);
    if(typeof window!=='undefined'&&typeof BroadcastChannel!=='undefined'&&!this.channel){this.channel=new BroadcastChannel(RECOVERY_DATABASE);this.channel.onmessage=e=>{if(e.data===this.id&&!this.state.working)this.refreshStored().catch(()=>{});};}
    const saved=await this.storage.load(this.id);await this.restore(saved);this.emit({ready:true,error:this.state.error});
   }catch{this.emit({ready:false,blocked:true,error:'Recovery storage is unavailable. No new supported action will be sent. Reopen the original session or ask staff for help.'});throw new RecoveryError(this.state.error,true);}
  })();return this.initialization;
 }
 async refreshStored(){
  if(!this.id||this.state.working)return;
  try{
   const saved=await this.storage.load(this.id);
   if(this.state.working)return;
   // A peer can acknowledge/delete the shared entry while this page retains its original draft.
   // Confirm the original metadata with current authority before allowing that page to unlock.
   if(!saved&&this.record){
    if(!this.valid(this.record)){this.emit({blocked:true,error:'Unreadable original metadata needs staff reconciliation even if another tab clears storage.'});return;}
    const receipt=await this.check();
    if(receipt.state==='NOT_RECORDED')this.emit({blocked:true,error:'The shared saved entry disappeared, but this request is still unconfirmed. Check, retry unchanged or cancel it before entering a replacement.'});
    return;
   }
   await this.restore(saved);
  }catch{this.emit({blocked:true,error:'Recovery storage or the original result could not be checked. Keep its request key and ask staff before entering a replacement.'});}
 }
 dispose(){this.channel?.close();this.channel=null;}
 private valid(record:JournalRecord){return record?.id===this.id&&record.version===1&&record.domain===this.domain&&UUID.test(record.resourceId)&&UUID.test(record.requestKey)&&typeof record.operation==='string'&&typeof record.digest==='string'&&/^[0-9a-f]{64}$/.test(record.digest)&&typeof record.createdAt==='string'&&Number.isFinite(Date.parse(record.createdAt))&&typeof record.iv==='string'&&record.iv.length===16&&typeof record.ciphertext==='string'&&record.ciphertext.length<=180000&&Object.keys(record).length===10;}
 private async bodyIntegrity(text:string){return [...new Uint8Array(await crypto.subtle.sign('HMAC',this.integrityKey!,encoder.encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
 private async decode(record:JournalRecord):Promise<Record<string,unknown>>{
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv),additionalData:aad(record)},this.key!,from64(record.ciphertext));
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(await this.bodyIntegrity(text)!==record.digest)throw new Error('Recovery body changed.');
  const body=JSON.parse(text);if(!validateRecoveryBody(this.domain,{operation:record.operation,resourceId:record.resourceId,body,requestKey:record.requestKey}))throw new Error('Recovery fields changed.');return body;
 }
 private async restore(record:JournalRecord|null){
  this.record=record;
  if(!record){this.emit({blocked:false,record:null,body:null,receipt:null,error:''});return;}
  if(!this.valid(record)){this.emit({blocked:true,body:null,record:null,error:'An unreadable saved attempt remains on this device. Ask staff to reconcile it before entering a replacement.'});return;}
  const {domain,operation,resourceId,requestKey,createdAt}=record;let body:Record<string,unknown>|null=null;
  try{body=await this.decode(record);}catch{}
  this.emit({blocked:true,record:{domain,operation,resourceId,requestKey,createdAt},body,receipt:null,error:body?'':'The saved body cannot be opened with this session. Check or cancel the original request with current authority; do not re-enter it blindly.'});
 }
 async run<T>(command:RecoveryCommand):Promise<T>{
  await this.initialize();if(this.state.working)throw new RecoveryError('Resolve the current saved attempt first.',true);
  if(!validateRecoveryBody(this.domain,command))throw new RecoveryError('No request sent. Review the supported command fields.',true);
  const text=canonical(command.body);if(encoder.encode(text).length>131072)throw new RecoveryError('No request sent. The saved request exceeds its recovery limit.',true);
  this.emit({working:true,error:''});let sent=false;
  try{
   const iv=crypto.getRandomValues(new Uint8Array(12));
   const record:JournalRecord={id:this.id,version:1,domain:this.domain,operation:command.operation,resourceId:command.resourceId.toLowerCase(),requestKey:command.requestKey.toLowerCase(),createdAt:new Date().toISOString(),digest:await this.bodyIntegrity(text),iv:bytes64(iv),ciphertext:''};
   record.ciphertext=bytes64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(record)},this.key!,encoder.encode(text))));
   const saved=await this.storage.insert(record);this.channel?.postMessage(this.id);await this.restore(saved);
   if(!this.valid(saved)||saved.requestKey!==record.requestKey||saved.operation!==record.operation||saved.resourceId!==record.resourceId||saved.digest!==record.digest)throw new RecoveryError('Another saved attempt needs resolution. No replacement request was sent.',true);
   if(!this.state.body)throw new RecoveryError('The original saved body is unreadable. Check or cancel it before entering another request.',true);
   sent=true;const result=await this.runner({operation:saved.operation,resourceId:saved.resourceId,requestKey:saved.requestKey,body:await this.decode(saved)});
   await this.storage.remove(this.id,saved.requestKey);this.channel?.postMessage(this.id);await this.restore(null);return result as T;
  }catch(e){
   this.emit({blocked:true,error:e instanceof Error?e.message:'Saved attempt needs resolution.'});
   if(!sent&&!(e instanceof RecoveryError))throw new RecoveryError('No request sent. Recovery storage could not be saved. Keep the original fields and retry storage.',true);throw e;
  }finally{this.emit({working:false});}
 }
 async retry(){const r=this.state.record;if(!r||!this.state.body)throw new RecoveryError('Check or cancel the original request before entering a replacement.');return this.run({operation:r.operation,resourceId:r.resourceId,requestKey:r.requestKey,body:structuredClone(this.state.body)});}
 async check(cancel=false){
  await this.initialize();const r=this.state.record;if(!r||this.state.working)throw new RecoveryError('Recovery metadata is unavailable. Ask staff for help.');this.emit({working:true,error:''});
  try{
   const receipt=await this.transport.check(r,cancel);
   if(!['COMMITTED','NOT_RECORDED','CANCELLED'].includes(receipt.state)||(['domain','operation','resourceId','requestKey'] as const).some(k=>receipt[k]!==r[k])||(receipt.state==='COMMITTED'?!receipt.resultId||!UUID.test(receipt.resultId)||!Number.isFinite(Date.parse(receipt.recordedAt||'')):receipt.resultId!==null)||(receipt.state==='NOT_RECORDED'?receipt.recordedAt!==null:!Number.isFinite(Date.parse(receipt.recordedAt||''))))throw new RecoveryError('Server recovery result does not match this saved attempt. Ask staff before entering another one.');
   this.emit({receipt});return receipt;
  }catch(e){this.emit({error:e instanceof Error?e.message:'The original result is unconfirmed.'});throw e;}finally{this.emit({working:false});}
 }
 async acknowledge(){const r=this.state.record,s=this.state.receipt;if(!r||!s||s.state==='NOT_RECORDED')throw new RecoveryError('Check the original result or confirm its cancellation first.');await this.storage.remove(this.id,r.requestKey);this.channel?.postMessage(this.id);await this.restore(null);return s.state;}
}
