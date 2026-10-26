import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const fixture=JSON.parse(process.env.MENU_MERCHANT_FIXTURE_CONFIG||'{}');assert.ok(fixture.host?.startsWith('/tmp/menumini-workspace-'));
const admin=new pg.Client({...fixture,user:'menu_test',password:'',ssl:false});await admin.connect();
const server=await createServer({root,configFile:false,envDir:false,plugins:[sveltekit()],server:{host:'127.0.0.1',port:0,strictPort:true}});
const cases=[];const check=(v,label)=>{assert.ok(v,label);cases.push(label);};const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner={userId:id(411),businessId:id(41),csrfToken:'FICTIONAL_STAFF_CSRF'},waiter={...owner,userId:id(414)},other={...owner,userId:id(412),businessId:id(42)};
const venue=(await admin.query("select id from menumini.venues where public_slug='fictional-published-cafe'")).rows[0].id;let merchant,guestAccess;
try{
 merchant=await server.ssrLoadModule('/src/lib/server/merchant-catalog.ts');guestAccess=await server.ssrLoadModule('/src/lib/server/guest-access.ts');
 const guest=await server.ssrLoadModule('/src/lib/server/guest-http.ts');const http=await server.ssrLoadModule('/src/lib/server/payer-http.ts');const service=await server.ssrLoadModule('/src/lib/server/staff-service.ts');const cashier=await server.ssrLoadModule('/src/lib/server/cashier-settlement.ts');
 const staff=(op,resource,body={})=>service.serviceCommand(owner,resource,op,body,crypto.randomUUID());
 const cash=(op,resource,body={},key=crypto.randomUUID())=>cashier.cashierCommand(owner,resource,op,body,key);
 async function staffCall(op,resource,body={},principal=owner,key=crypto.randomUUID(),headers={}){
  const url=new URL('http://127.0.0.1:5196/api/v2/merchant/payer-test');const response=await http.payerStaffResponse(new Request(url,{method:op==='CANDIDATES'?'GET':'POST',headers:{Origin:url.origin,'Content-Type':'application/json','X-CSRF-Token':principal?.csrfToken||'','Idempotency-Key':key,...headers},...(op!=='CANDIDATES'?{body:JSON.stringify(body)}:{})}),url,resource,op,principal);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('set-cookie'),null);return {status:response.status,body:await response.json()};
 }
 const staffGood=async(...args)=>{const r=await staffCall(...args);assert.ok(r.status<300,'payer staff '+args[0]+' '+r.body.code);return r.body;};
 async function gcall(op,session,body={},resource=null,key=crypto.randomUUID()){
  const url=new URL('http://127.0.0.1:5196/api/v2/guest/test');const write=!['CONTEXT','OFFER','ORDERS','READ_ORDER'].includes(op);
  const r=await guest.guestResponse(new Request(url,{method:write?'POST':'GET',headers:{Origin:url.origin,'Content-Type':'application/json','Idempotency-Key':key,...(session?{'X-CSRF-Token':session.context.csrfToken}:{})},...(write?{body:JSON.stringify(body)}:{})}),url,op,resource,session?.token||null);
  const value=await r.json();assert.ok(r.status<300,'guest fixture '+op+' '+value.code);return {body:value,cookie:r.headers.get('set-cookie')};
 }
 async function pcall(op,session,grantToken=null,body={},key=crypto.randomUUID(),headers={},query=''){
  const url=new URL('http://127.0.0.1:5196/api/v2/payer/test'+query);const write=!['DETAIL','CLAIMS'].includes(op);
  const response=await http.payerResponse(new Request(url,{method:write?'POST':'GET',headers:{Origin:url.origin,'Content-Type':'application/json','Idempotency-Key':key,...(session?{'X-CSRF-Token':session.context.csrfToken}:{}),...headers},...(write?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}),url,op,session?.token||null,grantToken);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');return{status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
 }
 const good=async(...args)=>{const r=await pcall(...args);assert.ok(r.status<300,'payer '+args[0]+' '+r.body.code);return r;};
 check((await staffCall('CANDIDATES',id(1),{},null)).status===401,'merchant identity remains closed for payer selection');
 check((await pcall('DETAIL',null)).status===401,'payer read requires an actual dining capability');
 await admin.query('begin');await admin.query('set local role menu_platform');await admin.query("select set_config('menu.user_id',$1,true)",[id(99)]);
 await admin.query("select menumini.apply_plan($1,'MINI',1,true,now(),now()+interval '1 month','FICTIONAL-PAYER-TEST')",[owner.businessId]);await admin.query('commit');
 await admin.query(`update menumini.venues set ordering_enabled=true,settings=settings||'{"pricing":{"confirmed":true,"taxMode":"NONE","taxRateBps":0,"serviceRateBps":0,"taxOnService":false}}'::jsonb where id=$1`,[venue]);
 await admin.query("insert into menumini.payment_accounts(id,merchant_id,provider,account_identifier,holder_name,ownership_verified_at) values($1,$2,'CBE','FICTIONAL-ACCOUNT-DO-NOT-PAY','Fictional payer venue',now()),($3,$2,'CBE','FICTIONAL-UNVERIFIED','Fictional unverified',null)",[id(9801),owner.businessId,id(9802)]);
 await admin.query('insert into menumini.venue_payment_accounts values($1,$2,$3),($1,$2,$4)',[owner.businessId,venue,id(9801),id(9802)]);
 const table=await staff('CREATE_TABLE',venue,{label:'Recovery table'});const visit=await staff('OPEN_STAFF_VISIT',venue,{tableId:table.id});
 const link=await guestAccess.issueGuestCapability(owner,table.id,'TABLE_LINK',table.version,crypto.randomUUID());
 const invitation=await guestAccess.issueGuestCapability(owner,visit.id,'VISIT_INVITATION',visit.version,crypto.randomUUID());
 async function newGuest(join=true){const r=await gcall('START',null,{tableToken:link.tableToken,sessionNonce:randomBytes(32).toString('base64url')});const s={token:r.cookie.split(';')[0].split('=')[1],context:r.body};if(join)await gcall('PAIR',s,{pairingToken:invitation.pairingToken},visit.id);return s;}
 const a=await newGuest(),b=await newGuest(),unpaired=await newGuest(false);
 const offer=(await gcall('OFFER',a)).body;const item=offer.menu.content.sections.flatMap(s=>s.items).find(i=>i.availableNow);const choices=item.modifiers.flatMap(g=>g.choices.filter(c=>c.isAvailable).slice(0,g.minSelections).map(c=>c.id));
 const orderBody={visitId:visit.id,menuPublicationId:offer.menu.publicationId,pricingFingerprint:offer.pricingFingerprint,items:[{itemId:item.id,quantity:1,choiceIds:choices,specialInstructions:'PRIVATE ITEM INSTRUCTION'}],customerNote:'PRIVATE GUEST A NOTE'};
 const recovery=await server.ssrLoadModule('/src/lib/server/recovery-http.ts');const browser=await server.ssrLoadModule('/src/lib/recovery/client.ts');
 async function recover(domain,resource,key,cancel=false,session=a,grant=null,principal=owner,operation=domain==='GUEST'?'SUBMIT':domain==='PAYER'?'CLAIM':'CREATE_TABLE',headers={}){
  const staffDomain=['SERVICE','CASHIER'].includes(domain);const url=new URL('http://127.0.0.1:5196/api/v2/recovery-fixture');const descriptor={operation,resourceId:resource};
  if(staffDomain&&!cancel){url.searchParams.set('operation',operation);url.searchParams.set('resourceId',resource);}
  const request=new Request(url,{method:cancel?'POST':'GET',headers:{Origin:url.origin,'Content-Type':'application/json','Idempotency-Key':key,'X-CSRF-Token':staffDomain?principal?.csrfToken||'':session?.context.csrfToken||'',...headers},...(cancel?{body:JSON.stringify(staffDomain?descriptor:{})}:{})});
  const r=staffDomain?await recovery.staffRecoveryResponse(request,url,venue,key,domain,cancel,principal):await recovery.guestRecoveryResponse(request,url,resource,key,domain,cancel,session?.token||null,grant);
  assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('set-cookie'),null);return{status:r.status,body:await r.json()};
 }
 const recoveryGood=async(...args)=>{const r=await recover(...args);assert.ok(r.status<300,'recovery '+args[0]+' '+r.body.code);return r.body;};
 async function guestSubmit(key,body=orderBody,session=a){const url=new URL('http://127.0.0.1:5196/api/v2/guest/orders');const r=await guest.guestResponse(new Request(url,{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/json','Idempotency-Key':key,'X-CSRF-Token':session.context.csrfToken},body:JSON.stringify(body)}),url,'SUBMIT',null,session.token);return{status:r.status,body:await r.json()};}
 const missingKey=crypto.randomUUID();check((await recoveryGood('GUEST',visit.id,missingKey)).state==='NOT_RECORDED','unknown own request is unrecorded without implying it cannot arrive later');
 const cancelled=await recoveryGood('GUEST',visit.id,missingKey,true);check(cancelled.state==='CANCELLED'&&cancelled.resultId===null,'guest cancellation creates no order or financial result');
 check(JSON.stringify(await recoveryGood('GUEST',visit.id,missingKey,true))===JSON.stringify(cancelled),'same cancellation is stable and idempotent');
 check((await guestSubmit(missingKey)).status===409,'late original guest request cannot commit after confirmed cancellation');
 const orderKey=crypto.randomUUID();const placed=await guestSubmit(orderKey);check(placed.status===201,'new reviewed guest key can create one order');
 const recorded=await recoveryGood('GUEST',visit.id,orderKey);check(recorded.state==='COMMITTED'&&recorded.resultId===placed.body.id,'guest recovery identifies the committed original result');
 check((await recoveryGood('GUEST',visit.id,orderKey,true)).state==='COMMITTED','cancellation never reverses a previously committed order');
 await staff('TRANSITION_ORDER',placed.body.id,{expectedVersion:1,status:'ACCEPTED'});
 check((await recoveryGood('GUEST',visit.id,orderKey)).resultId===placed.body.id&&(await gcall('READ_ORDER',a,{},placed.body.id)).body.status==='ACCEPTED','recovery receipt identifies earlier commit while current status is read separately');
 check((await recoveryGood('GUEST',visit.id,orderKey,false,b)).state==='NOT_RECORDED','another diner cannot resolve this guest original result');
 check((await recover('GUEST',visit.id,orderKey,false,null)).status===401,'recovery cannot replace a real dining capability with a request UUID');
 check((await recover('GUEST',visit.id,orderKey,true,a,null,owner,'SUBMIT',{'X-CSRF-Token':b.context.csrfToken})).status===403,'guest cancellation checks current session CSRF');
 const table2=await staff('CREATE_TABLE',venue,{label:'Recovery other table'});const visit2=await staff('OPEN_STAFF_VISIT',venue,{tableId:table2.id});
 check((await recover('GUEST',visit2.id,orderKey)).status===403,'guest recovery cannot cross seating association');
 const serviceKey=crypto.randomUUID();check((await recoveryGood('SERVICE',venue,serviceKey)).state==='NOT_RECORDED','staff recovery is scoped to the original service command');
 await recoveryGood('SERVICE',venue,serviceKey,true);
 let denied=false;try{await service.serviceCommand(owner,venue,'CREATE_TABLE',{label:'Cancelled recovery table'},serviceKey);}catch(e){denied=e.status===409;}check(denied,'late table creation is blocked by the same cancellation ledger');
 const createdKey=crypto.randomUUID();const created=await service.serviceCommand(owner,venue,'CREATE_TABLE',{label:'Recovered committed table'},createdKey);
 check((await recoveryGood('SERVICE',venue,createdKey)).resultId===created.id,'staff lookup returns original created table ID');
 check((await recover('SERVICE',venue,createdKey,false,a,null,waiter)).status===403,'waiter cannot resolve owner table administration');
 check((await recover('SERVICE',venue,createdKey,false,a,null,other)).status===403,'service recovery cannot cross business boundary');
 check((await recover('SERVICE',venue,createdKey,false,a,null,null)).status===401,'merchant recovery HTTP remains closed without verified identity');
 const receiptKey=crypto.randomUUID();const receiptBody={method:'CASH',receivedAmount:'100.00',tenderedAmount:'100.00',changeAmount:'0.00',verificationNote:'Fictional counted cash recovery fixture',fundsConfirmed:true};const receipt=await cash('RECORD_RECEIPT',visit.billId,receiptBody,receiptKey);
 const receiptOutcome=await recoveryGood('CASHIER',visit.billId,receiptKey,false,a,null,owner,'RECORD_RECEIPT');
 check(receiptOutcome.resultId===receipt.id&&receiptOutcome.state==='COMMITTED','cashier recovery resolves original counted-cash receipt without recording funds again');
 const receiptsBefore=(await admin.query('select count(*)::int n from menumini.recorded_receipts')).rows[0].n;
 await recoveryGood('CASHIER',visit.billId,receiptKey,true,a,null,owner,'RECORD_RECEIPT');await cash('RECORD_RECEIPT',visit.billId,receiptBody,receiptKey);
 check((await admin.query('select count(*)::int n from menumini.recorded_receipts')).rows[0].n===receiptsBefore,'cashier cancellation after commit and exact retry do not duplicate cash');
 check((await recover('CASHIER',visit2.billId,receiptKey,false,a,null,owner,'RECORD_RECEIPT')).status===409,'an existing request key cannot be reassigned to a different bill');
 check((await recover('CASHIER',visit.billId,receiptKey,false,a,null,waiter,'RECORD_RECEIPT')).status===403,'current cashier permission is required for recovery');
 const cancelledCash=crypto.randomUUID();await recoveryGood('CASHIER',visit.billId,cancelledCash,true,a,null,owner,'RECORD_RECEIPT');denied=false;
 try{await cash('RECORD_RECEIPT',visit.billId,receiptBody,cancelledCash);}catch(e){denied=e.status===409;}check(denied,'a cancelled cash attempt cannot later become a received-funds record');
 let bill=await staff('READ_BILL',visit.billId);const grant=await staffGood('ISSUE',bill.id,{guestSessionId:a.context.session.id,expectedBillVersion:bill.version});const otherGrant=await staffGood('ISSUE',bill.id,{guestSessionId:b.context.session.id,expectedBillVersion:bill.version});
 const destination=(await good('DETAIL',a,grant.accessToken)).body.accounts[0];const claimBody={accountId:destination.id,destinationFingerprint:destination.destinationFingerprint,reportedAmount:'60.00',providerReference:'FICTIONAL-RECOVERY-CLAIM',transferSent:true};
 const cancelledClaim=crypto.randomUUID();await recoveryGood('PAYER',bill.id,cancelledClaim,true,a,grant.accessToken);
 check((await pcall('CLAIM',a,grant.accessToken,claimBody,cancelledClaim)).status===409,'late transfer report cannot appear after confirmed cancellation');
 const claimKey=crypto.randomUUID();const claim=(await good('CLAIM',a,grant.accessToken,claimBody,claimKey)).body;
 check((await recoveryGood('PAYER',bill.id,claimKey,false,a,grant.accessToken)).resultId===claim.claim.id,'payer recovery resolves its original pending transfer evidence');
 check((await recoveryGood('PAYER',bill.id,claimKey,false,b,otherGrant.accessToken)).state==='NOT_RECORDED','another authorized payer cannot recover another payer reference or claim');
 check((await recover('PAYER',visit2.billId,claimKey,false,a,grant.accessToken)).status===403,'payer recovery cannot cross the authorized bill');
 check((await recover('PAYER',bill.id,claimKey,false,a,null)).status===403,'payer recovery still requires separate bill authority');
 const rotated=await staffGood('ISSUE',bill.id,{guestSessionId:a.context.session.id,expectedBillVersion:bill.version});
 check((await recover('PAYER',bill.id,claimKey,false,a,grant.accessToken)).status===403,'revoked payer grant cannot inspect or cancel saved attempts');
 check((await recoveryGood('PAYER',bill.id,claimKey,false,a,rotated.accessToken)).resultId===claim.claim.id,'renewed bill authority for the same guest can resolve its earlier committed report');
 check(!JSON.stringify(recorded).includes('PRIVATE')&&!JSON.stringify(receiptOutcome).includes('verificationNote'),'recovery receipts disclose neither original private body nor staff evidence');
 // Exercise the actual browser recovery core against real request handlers; storage is an explicit in-memory test double here.
 const records=new Map();const storage={async load(id){return structuredClone(records.get(id)||null);},async insert(r){if(!records.has(r.id))records.set(r.id,structuredClone(r));return structuredClone(records.get(r.id));},async remove(id,key){if(records.get(id)?.requestKey===key)records.delete(id);}};
 const identity={scope:a.context.session.venueId+':'+a.context.session.id,secret:a.context.csrfToken};
 const transport={async check(d,cancel){return recoveryGood('GUEST',d.resourceId,d.requestKey,cancel);}};
 const runOrder=async c=>{const r=await guestSubmit(c.requestKey,c.body);if(r.status>=400)throw new browser.RecoveryError(r.body.detail);return r.body;};
 const lostKey=crypto.randomUUID();let sends=0;const core=new browser.CommandRecovery('GUEST',identity,transport,async c=>{sends++;await runOrder(c);throw new Error('Fictional response lost after commit');},storage);
 try{await core.run({operation:'SUBMIT',resourceId:visit.id,requestKey:lostKey,body:orderBody});}catch{}
 check(core.snapshot().blocked&&records.size===1,'an uncertain saved action keeps its encrypted journal and blocks replacement');
 const raw=JSON.stringify([...records.values()]);check(!raw.includes(orderBody.customerNote)&&!raw.includes('PRIVATE ITEM INSTRUCTION')&&![a.context.csrfToken,a.token,rotated.accessToken].some(v=>raw.includes(v)),'journal stores encrypted body without private plaintext, cookies or capability/encryption secrets');
 const restored=new browser.CommandRecovery('GUEST',identity,transport,runOrder,storage);await restored.initialize();
 check(restored.snapshot().body.customerNote===orderBody.customerNote&&sends===1,'new recovery controller restores exact body without automatically resending');
 check((await restored.check()).state==='COMMITTED','after lost response the actual server confirms the committed request');await restored.acknowledge();check(records.size===0,'acknowledging a confirmed result removes only its local pending entry');
 const beforeKey=crypto.randomUUID();const beforeCore=new browser.CommandRecovery('GUEST',identity,transport,async()=>{throw new Error('Fictional network loss before delivery');},storage);
 try{await beforeCore.run({operation:'SUBMIT',resourceId:visit.id,requestKey:beforeKey,body:orderBody});}catch{}
 const afterReload=new browser.CommandRecovery('GUEST',identity,transport,runOrder,storage);await afterReload.initialize();check((await afterReload.check()).state==='NOT_RECORDED','undelivered original request stays unrecorded after restored journal');
 await afterReload.retry();check(records.size===0&&(await recoveryGood('GUEST',visit.id,beforeKey)).state==='COMMITTED','explicit unchanged retry saves one original request and clears the journal');
 const noStorage={...storage,async insert(){throw new Error('Fictional quota unavailable');}};let unsafeSends=0;const blocked=new browser.CommandRecovery('GUEST',identity,transport,async()=>{unsafeSends++;},noStorage);
 try{await blocked.run({operation:'SUBMIT',resourceId:visit.id,requestKey:crypto.randomUUID(),body:orderBody});}catch{}
 check(unsafeSends===0,'failed browser storage prevents sending a new business mutation');
 const secretKey=crypto.randomUUID();const secretCore=new browser.CommandRecovery('GUEST',identity,transport,async()=>{throw new Error('Fictional interruption');},storage);
 try{await secretCore.run({operation:'SUBMIT',resourceId:visit.id,requestKey:secretKey,body:orderBody});}catch{}
 const changedSecret=new browser.CommandRecovery('GUEST',{...identity,secret:'FICTIONAL-CHANGED-ENCRYPTION-SECRET'},transport,runOrder,storage);await changedSecret.initialize();
 check(changedSecret.snapshot().body===null&&changedSecret.snapshot().blocked,'changed session encryption secret never reveals or replaces the old body');
 check((await changedSecret.check()).state==='NOT_RECORDED','current authorized session can check original metadata even when body is unreadable');
 await changedSecret.check(true);await changedSecret.acknowledge();check((await guestSubmit(secretKey)).status===409,'unreadable-body recovery can safely cancel a delayed request without resending it');
 const tamperKey=crypto.randomUUID();try{await secretCore.run({operation:'SUBMIT',resourceId:visit.id,requestKey:tamperKey,body:orderBody});}catch{}
 const entry=[...records.values()][0];entry.ciphertext=(entry.ciphertext[0]==='A'?'B':'A')+entry.ciphertext.slice(1);records.set(entry.id,entry);
 const corrupt=new browser.CommandRecovery('GUEST',identity,transport,runOrder,storage);await corrupt.initialize();check(corrupt.snapshot().body===null&&corrupt.snapshot().blocked,'corrupted ciphertext remains blocked and cannot become an automatic replacement');await corrupt.check(true);await corrupt.acknowledge();
 // Two independently mounted controllers share one atomic journal entry. Neither may replace the other tab's pending body.
 const peerIdentity={scope:b.context.session.venueId+':'+b.context.session.id,secret:b.context.csrfToken};
 const peerTransport={async check(d,cancel){return recoveryGood('GUEST',d.resourceId,d.requestKey,cancel,b);}};
 let releaseDelivery;const deliveryGate=new Promise(resolve=>releaseDelivery=resolve);let originalReached;const reached=new Promise(resolve=>originalReached=resolve);let peerSends=0;
 const firstTab=new browser.CommandRecovery('GUEST',peerIdentity,peerTransport,async c=>{originalReached();await deliveryGate;const r=await guestSubmit(c.requestKey,c.body,b);if(r.status>=400)throw new browser.RecoveryError(r.body.detail);return r.body;},storage);
 const secondTab=new browser.CommandRecovery('GUEST',peerIdentity,peerTransport,async()=>{peerSends++;},storage);
 const firstKey=crypto.randomUUID(),secondKey=crypto.randomUUID();
 const firstDelivery=firstTab.run({operation:'SUBMIT',resourceId:visit.id,requestKey:firstKey,body:orderBody}).catch(e=>e);await reached;
 let peerBlocked=false;try{await secondTab.run({operation:'SUBMIT',resourceId:visit.id,requestKey:secondKey,body:{...orderBody,customerNote:'Different unsent tab draft'}});}catch(e){peerBlocked=e.notSent===true;}
 check(peerBlocked&&peerSends===0&&secondTab.snapshot().record.requestKey===firstKey&&secondTab.snapshot().body.customerNote===orderBody.customerNote,'atomic shared journal rejects another tab replacement and retains the original encrypted body');
 await secondTab.check(true);await secondTab.acknowledge();releaseDelivery();const delayedResult=await firstDelivery;
 check(delayedResult instanceof Error&&(await recoveryGood('GUEST',visit.id,firstKey,false,b)).state==='CANCELLED','another tab cancellation prevents the already-waiting original delivery from recording');
 await firstTab.refreshStored();check(firstTab.snapshot().blocked&&firstTab.snapshot().receipt?.state==='CANCELLED'&&records.size===0,'peer deletion rechecks current server authority and retains confirmation before unlocking the original tab');
 await firstTab.acknowledge();check(!firstTab.snapshot().blocked&&peerSends===0,'both tabs can acknowledge the same cancellation without resending either draft');
 await admin.query('update menumini.merchant_memberships set is_active=false where merchant_id=$1 and user_id=$2',[owner.businessId,owner.userId]);
 check((await recover('SERVICE',venue,createdKey)).status===403&&(await recover('CASHIER',visit.billId,receiptKey,false,a,null,owner,'RECORD_RECEIPT')).status===403,'revoked staff membership cannot recover previously recorded service or cashier results');
 await admin.query('update menumini.merchant_memberships set is_active=true where merchant_id=$1 and user_id=$2',[owner.businessId,owner.userId]);
 for(const [domain,op,body]of [['GUEST','PAIR',{pairingToken:'P'.repeat(43)}],['PAYER','BIND',{accessToken:'B'.repeat(43)}],['SERVICE','ISSUE_INVITATION',{expectedVersion:1}]]){
  const safe=new browser.CommandRecovery(domain,identity,transport,async()=>{unsafeSends++;},storage);let stopped=false;try{await safe.run({operation:op,resourceId:visit.id,requestKey:crypto.randomUUID(),body});}catch{stopped=true;}check(stopped&&records.size===0,'credential operation '+op+' cannot enter durable command storage');
 }
 const rate=await newGuest();let last;
 for(let n=0;n<10;n++)last=await recoveryGood('GUEST',visit.id,crypto.randomUUID(),true,rate);
 check((await recover('GUEST',visit.id,crypto.randomUUID(),true,rate)).status===429,'anonymous cancellation tombstones have a durable ten-per-minute abuse bound');
 check((await recoveryGood('GUEST',visit.id,last.requestKey,true,rate)).state==='CANCELLED','repeat cancellation remains recoverable after cancellation rate limit');
 const sql=await admin.query("select count(*)::int n from menumini.command_cancellations");check(sql.rows[0].n>0,'cancellation results persist as explicit server records');
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;let networkRequests=0;
 async function net(path,session=a,token=null,cancel=false,key=crypto.randomUUID()){
  networkRequests++;const r=await fetch(origin+'/api/v2'+path,{method:cancel?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':key,'X-CSRF-Token':session.context.csrfToken,Cookie:'menu_dining='+session.token+(token?'; menu_bill_access='+token:'')},...(cancel?{body:'{}'}:{})});return{status:r.status,body:await r.json()};
 }
 check((await net('/guest/visits/'+visit.id+'/order-requests/'+orderKey)).body.resultId===placed.body.id,'actual guest cookie HTTP resolves earlier committed order');
 check((await net('/guest/visits/'+visit.id+'/order-requests/'+missingKey)).body.state==='CANCELLED','actual HTTP retains cancelled attempt outcome');
 check((await net('/payer/bills/'+bill.id+'/payment-requests/'+claimKey,a,rotated.accessToken)).body.resultId===claim.claim.id,'actual payer cookie HTTP resolves only its own committed claim');
 check((await net('/payer/bills/'+bill.id+'/payment-requests/'+claimKey,b,otherGrant.accessToken)).body.state==='NOT_RECORDED','actual HTTP does not disclose another authorized payer claim');
 check((await net('/merchant/branches/'+venue+'/service-requests/'+createdKey+'?operation=CREATE_TABLE&resourceId='+venue)).status===401,'guest cookies do not authorize real merchant recovery HTTP');
 const pmKey=crypto.randomUUID();const postman=await new Promise((resolveResult,reject)=>{const child=spawn('python3',[resolve(root,'../scripts/run-recovery-postman-fixture.py')],{cwd:root,stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',()=>{});child.on('error',reject);child.on('close',code=>code===0?resolveResult(JSON.parse(output)):reject(new Error('Recovery Postman fixture failed; inspect the redacted local report.')));child.stdin.end(JSON.stringify({origin,guestToken:a.token,csrfToken:a.context.csrfToken,accessToken:rotated.accessToken,visitId:visit.id,billId:bill.id,requestKey:pmKey}));});check(postman.passed,'maintained guest/payer recovery Postman requests use actual cookie resolution');
 const projections=[{schema:'RecoveryReceipt',value:recorded},{schema:'RecoveryReceipt',value:cancelled},{schema:'RecoveryReceipt',value:receiptOutcome},{schema:'RecoveryReceipt',value:await recoveryGood('PAYER',bill.id,claimKey,false,a,rotated.accessToken)},{schema:'RecoveryReceipt',value:await recoveryGood('GUEST',visit.id,crypto.randomUUID())}];await writeFile(resolve(root,'../docs/contracts/recovery-db-examples.json'),JSON.stringify(projections,null,2)+'\n');
 console.log(JSON.stringify({recovery_result:{passed:cases.length,failed:0,cases,http_requests:networkRequests,postman,database_projection_examples:projections.length},concurrency_fixture:{venue,visit:visit.id,bill:bill.id,guestHash:guestAccess.hashCapability(a.token),csrfHash:guestAccess.hashCapability(a.context.csrfToken),grantHash:guestAccess.hashCapability(rotated.accessToken),orderBody,receiptBody,claimBody:{...claimBody,providerReference:'FICTIONAL-RECOVERY-RACE'},orderKey,receiptKey}}));
}finally{await guestAccess?.closeGuestPool();await merchant?.closeMerchantCatalogPool();await admin.end();await server.close();}
