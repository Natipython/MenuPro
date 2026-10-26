// Fictional browser memory. Actual capability and ledger rules are tested in PostgreSQL.
import type {PayerGateway,PayerStaffGateway} from './client';
import type {BillGrant,PayerGrantState,PayerOperation,PayerStaffOperation} from './model';
import {deviceCode,validatePayerCommand} from './model';
import {GuestClientError} from '$lib/guest/client';
import {ServiceClientError} from '$lib/service/client';
import type {StaffVisit} from '$lib/service/model';
import type {rehearsalCashierGateway} from '$lib/cashier/rehearsal';
export interface FictionalGuestSession{id:string;visitId:string|null;active:boolean;expiresAt:string}
export function rehearsalPayers(visits:()=>StaffVisit[],sessions:()=>FictionalGuestSession[],cashier:ReturnType<typeof rehearsalCashierGateway>){
 let sequence=9900;const grants:BillGrant[]=[];const staffResults=new Map<string,{payload:string;value:unknown}>();
 const id=()=> '00000000-0000-4000-8000-'+String(sequence++).padStart(12,'0');
 const active=(g:BillGrant)=>g.active&&Date.parse(g.expiresAt)>Date.now()&&sessions().some(s=>s.id===g.guestSessionId&&s.active&&Date.parse(s.expiresAt)>Date.now());
 const state=(g:BillGrant):PayerGrantState=>({id:g.id,version:g.version,expiresAt:g.expiresAt,active:active(g)});
 const staff:PayerStaffGateway={async call<T>(op:PayerStaffOperation,resource:string,body:Record<string,unknown>={},key?:string):Promise<T>{
  const fail=(status:number,message:string):never=>{throw new ServiceClientError(status,message);};
  const payload=JSON.stringify({op,resource,body});const prior=key?staffResults.get(key):null;
  if(prior){if(prior.payload!==payload)fail(409,'This authorization key already has different content.');const value=structuredClone(prior.value);if(op==='ISSUE')return{...(value as BillGrant),active:active(grants.find(g=>g.id===(value as BillGrant).id)!)} as T;return value as T;}
  let value:unknown;
  if(op==='CANDIDATES'){
   const visit=visits().find(v=>v.billId===resource);if(!visit)fail(404,'Bill unavailable.');
   value={billId:resource,items:sessions().filter(s=>s.visitId===visit!.id&&s.active&&Date.parse(s.expiresAt)>Date.now()).map(s=>({guestSessionId:s.id,deviceCode:deviceCode(s.id),expiresAt:s.expiresAt,grant:(()=>{const g=[...grants].reverse().find(g=>g.billId===resource&&g.guestSessionId===s.id);return g?state(g):null;})()}))};
  }else{
   if(validatePayerCommand(op,body).length)fail(422,'Choose a current joined device and version.');
   if(op==='ISSUE'){
    const visit=visits().find(v=>v.billId===resource);if(!visit)fail(404,'Bill unavailable.');
    if(cashier.currentBill(visit!.id).version!==body.expectedBillVersion)fail(409,'The bill changed. Refresh bills before authorizing a payer.');
    const s=sessions().find(s=>s.id===body.guestSessionId&&s.visitId===visit!.id&&s.active&&Date.parse(s.expiresAt)>Date.now());if(!s)fail(403,'Choose a joined active device.');
    grants.filter(g=>g.billId===resource&&g.guestSessionId===s!.id&&g.active).forEach(g=>{g.active=false;g.version++;});
    const grant:BillGrant={id:id(),version:1,billId:resource,guestSessionId:s!.id,expiresAt:new Date(Math.min(Date.parse(s!.expiresAt),Date.now()+3600000)).toISOString(),active:true,accessToken:('FICTIONAL_PAYER_'+String(sequence++)).padEnd(43,'X')};grants.push(grant);value=grant;
   }else{
    const grant=grants.find(g=>g.id===resource);if(!grant||grant.version!==body.expectedVersion)fail(409,'Authorization changed. Refresh joined devices.');grant!.active=false;grant!.version++;value=state(grant!);
   }
  }
  const copy=structuredClone(value);if(key)staffResults.set(key,{payload,value:copy});return structuredClone(copy) as T;
 }};
 function guest(session:()=>FictionalGuestSession):PayerGateway{
  let binding:string|null=null;const results=new Map<string,{payload:string;value:unknown}>();
  return{async call<T>(op:PayerOperation,body:Record<string,unknown>={},key?:string):Promise<T>{
   const fail=(status:number,message:string):never=>{throw new GuestClientError(status,message);};
   const s=session();if(!s.active||Date.parse(s.expiresAt)<=Date.now())fail(401,'Your table session has ended.');
   const g=op==='BIND'?grants.find(g=>g.accessToken===body.accessToken):grants.find(g=>g.id===binding);
   if(!g||g.guestSessionId!==s.id||(!active(g)&&op!=='LEAVE'))fail(403,'This bill code belongs to another device or is no longer active. Ask the cashier.');
   const grant=g!;const payload=JSON.stringify({op,grantId:grant.id,body});const prior=key?results.get(key):null;
   if(prior){if(prior.payload!==payload)fail(409,'This retry key already has a different report.');return structuredClone(prior.value) as T;}
   let value:unknown;
   if(op==='DETAIL')value=cashier.payerDetail(grant.billId,s.id,grant.expiresAt);
   else if(op==='CLAIMS'){const entries=cashier.payerClaims(grant.billId,s.id);const at=body.cursor?entries.findIndex(c=>c.claim.id===body.cursor)+1:0;const limit=Number(body.limit||50);value={items:entries.slice(at,at+limit),nextCursor:entries.length>at+limit?entries[at+limit-1].claim.id:null};}
   else{
    if(validatePayerCommand(op,body).length)fail(422,'Review the bill code or transfer report.');
    if(op==='BIND'){binding=grant.id;value={billId:grant.billId,expiresAt:grant.expiresAt};}
    else if(op==='LEAVE'){grant.active=false;grant.version++;value={revoked:true};}
    else try{value=cashier.submitPayerReport(grant.billId,s.id,body);}catch(e){fail(e instanceof ServiceClientError?e.status:422,e instanceof Error?e.message:'Report unavailable.');}
   }
   const copy=structuredClone(value);if(key)results.set(key,{payload,value:copy});return structuredClone(copy) as T;
  }};
 }
 return{staff,guest};
}
