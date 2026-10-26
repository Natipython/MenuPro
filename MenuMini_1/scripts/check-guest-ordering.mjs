import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=JSON.parse(process.env.MENU_MERCHANT_FIXTURE_CONFIG||'{}');assert.ok(fixture.host?.startsWith('/tmp/menumini-workspace-'));
const admin=new pg.Client({...fixture,user:'menu_test',password:'',ssl:false});await admin.connect();
const server=await createServer({root,configFile:false,envDir:false,plugins:[sveltekit()],server:{host:'127.0.0.1',port:0,strictPort:true}});
const cases=[];const check=(v,label)=>{assert.ok(v,label);if(!cases.includes(label))cases.push(label);};const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner={userId:id(411),businessId:id(41),csrfToken:'FICTIONAL_STAFF_CSRF'};const waiter={...owner,userId:id(414)},editor={...owner,userId:id(413)},other={...owner,userId:id(412),businessId:id(42)};
const venue=(await admin.query("select id from menumini.venues where public_slug='fictional-published-cafe'")).rows[0].id;
let pool,access;
try{
 pool=await server.ssrLoadModule('/src/lib/server/merchant-catalog.ts');access=await server.ssrLoadModule('/src/lib/server/guest-access.ts');
 const http=await server.ssrLoadModule('/src/lib/server/guest-http.ts');const service=await server.ssrLoadModule('/src/lib/server/staff-service.ts');
 const staff=(op,resource,body={})=>service.serviceCommand(owner,resource,op,body,crypto.randomUUID());
 async function issue(kind,resource,version,principal=owner,key=crypto.randomUUID(),headers={}){
  const url=new URL('http://127.0.0.1:5196/api/v2/merchant/issuance');const response=await http.issueGuestResponse(new Request(url,{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/json','X-CSRF-Token':principal?.csrfToken||'','Idempotency-Key':key,...headers},body:JSON.stringify({expectedVersion:version})}),url,resource,kind,principal);
  check(response.headers.get('cache-control')==='no-store'&&response.headers.get('set-cookie')===null,'issuance responses are private and create no merchant session');
  return {status:response.status,body:await response.json()};
 }
 const startNonces=new Map();
 async function call(op,session=null,body={},resource=null,key=crypto.randomUUID(),headers={},query=''){
  if(op==='START'&&typeof body==='object'){if(!startNonces.has(key))startNonces.set(key,randomBytes(32).toString('base64url'));body={sessionNonce:startNonces.get(key),...body};}
  const url=new URL('http://127.0.0.1:5196/api/v2/guest/test'+query);const write=!['CONTEXT','OFFER','ORDERS','READ_ORDER'].includes(op);
  const response=await http.guestResponse(new Request(url,{method:write?'POST':'GET',headers:{Origin:url.origin,'Content-Type':'application/json','Idempotency-Key':key,...(session?.context?{'X-CSRF-Token':session.context.csrfToken}:{}),...headers},...(write?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}),url,op,resource,session?.token||null);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  return{status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
 }
 const good=async(...args)=>{const r=await call(...args);assert.ok(r.status<300,`${args[0]} failed: ${r.status} ${r.body.code}`);return r;};
 async function start(tableToken,key=crypto.randomUUID(),existing=null){const r=await good('START',existing,{tableToken},null,key);return {token:r.cookie.split(';')[0].split('=')[1],context:r.body,cookie:r.cookie};}
 check((await issue('TABLE_LINK',id(1),1,null)).status===401,'unverified merchant cannot issue a guest capability');
 check((await call('CONTEXT')).status===401,'guest UUID or absent cookie cannot establish an anonymous principal');
 check((await call('START',null,{tableToken:'x'.repeat(43)})).status===403,'unknown table link grants no session');
 await admin.query('begin');await admin.query('set local role menu_platform');await admin.query("select set_config('menu.user_id',$1,true)",[id(99)]);
 await admin.query("select menumini.apply_plan($1,'MINI',1,true,now(),now()+interval '1 month','FICTIONAL-GUEST-TEST')",[owner.businessId]);await admin.query('commit');
 await admin.query(`update menumini.venues set ordering_enabled=true,settings=settings||'{"pricing":{"confirmed":true,"taxMode":"NONE","taxRateBps":0,"serviceRateBps":0,"taxOnService":false}}'::jsonb where id=$1`,[venue]);
 const table=await staff('CREATE_TABLE',venue,{label:'Guest test table'});const visit=await staff('OPEN_STAFF_VISIT',venue,{tableId:table.id});
 check((await issue('TABLE_LINK',table.id,table.version,waiter)).status===403,'waiter cannot rotate owner table link');
 check((await issue('VISIT_INVITATION',visit.id,visit.version,editor)).status===403,'editor cannot issue a visit invitation');
 check((await issue('TABLE_LINK',table.id,table.version,other)).status===403,'cross-business staff cannot issue a known table link');
 const linkKey=crypto.randomUUID();const link=(await issue('TABLE_LINK',table.id,table.version,owner,linkKey)).body;
 check(link.active&&link.tableToken.length===43,'owner issues an opaque table link with no bill access');
 const sessionKey=crypto.randomUUID();const a=await start(link.tableToken,sessionKey);const b=await start(link.tableToken);
 check(a.cookie.includes('HttpOnly')&&a.cookie.includes('SameSite=Strict')&&a.cookie.includes('Path=/')&&!a.cookie.includes('Domain='),'guest cookie is HttpOnly host-only SameSite Strict and path /');
 check(!('token' in a.context)&&!('capabilityHash' in a.context)&&!a.context.association,'static table link creates only an unpaired session');
 check((await start(link.tableToken,sessionKey,a)).token===a.token,'lost session-start response can replay the same cookie');
 check((await call('START',null,{tableToken:link.tableToken,sessionNonce:randomBytes(32).toString('base64url')},null,sessionKey)).status===409,'known retry key and public table link cannot recover another session without its private start nonce');
 check((await call('START',a,{tableToken:link.tableToken})).status===409,'another session start cannot silently replace an active cookie');
 const offer=(await good('OFFER',a)).body;const item=offer.menu.content.sections.flatMap(s=>s.items).find(i=>i.availableNow);
 const choices=item.modifiers.flatMap(g=>g.choices.filter(c=>c.isAvailable).slice(0,g.minSelections).map(c=>c.id));
 const orderBody={visitId:visit.id,menuPublicationId:offer.menu.publicationId,pricingFingerprint:offer.pricingFingerprint,items:[{itemId:item.id,quantity:1,choiceIds:choices}],customerNote:'Fictional private guest A note'};
 check((await call('SUBMIT',a,orderBody)).status===403,'unpaired guest cannot order even with known visit and publication');
 const inviteKey=crypto.randomUUID();const invitation=(await issue('VISIT_INVITATION',visit.id,visit.version,waiter,inviteKey)).body;
 check(invitation.active&&Date.parse(invitation.expiresAt)-Date.now()<=300000,'authorized floor staff issues a five-minute private invitation');
 const wrong=await call('PAIR',a,{pairingToken:'z'.repeat(43)},visit.id);check(wrong.status===403,'wrong private invitation is rejected');
 const pairKey=crypto.randomUUID();await good('PAIR',a,{pairingToken:invitation.pairingToken},visit.id,pairKey);
 check((await good('CONTEXT',a)).body.association?.canSubmitOrders,'paired own table session can request an order');
 await good('PAIR',b,{pairingToken:invitation.pairingToken},visit.id);
 const table2=await staff('CREATE_TABLE',venue,{label:'Other guest table'});const visit2=await staff('OPEN_STAFF_VISIT',venue,{tableId:table2.id});
 const link2=(await issue('TABLE_LINK',table2.id,table2.version)).body;const c=await start(link2.tableToken);
 check((await call('PAIR',c,{pairingToken:invitation.pairingToken},visit.id)).status===403,'valid invitation cannot join a session for another table');
 const before=(await admin.query('select count(*)::int as n from menumini.orders')).rows[0].n;
 const orderKey=crypto.randomUUID();const placed=(await good('SUBMIT',a,orderBody,null,orderKey)).body;
 check(placed.totalAmount==='80.00'&&placed.status==='SUBMITTED'&&!('allowedTransitions' in placed),'guest request is server-priced with no staff transitions or payment assertion');
 check((await call('READ_ORDER',b,{},placed.id)).status===404&&(await call('READ_ORDER',b,{},id(999))).status===404,'other guest and unknown order use the same unavailable response');
 check((await good('ORDERS',b,{})).body.items.length===0,'guest B list does not reveal guest A order or private note');
 check((await good('ORDERS',a,{})).body.items[0].customerNote===orderBody.customerNote,'own list returns only this guest private order note');
 let current=await staff('TRANSITION_ORDER',placed.id,{expectedVersion:1,status:'ACCEPTED'});
 const replay=(await good('SUBMIT',a,orderBody,null,orderKey)).body;
 check(JSON.stringify(replay)===JSON.stringify(placed),'exact guest retry retains original submitted response after staff acceptance');
 check((await good('READ_ORDER',a,{},placed.id)).body.status==='ACCEPTED','separate own-order read returns current accepted state');
 check((await admin.query('select count(*)::int as n from menumini.orders')).rows[0].n===before+1,'guest retry creates one durable order only');
 check((await call('SUBMIT',a,{...orderBody,customerNote:'Changed'},null,orderKey)).status===409,'same order key with changed content conflicts');
 const a2=(await good('SUBMIT',a,orderBody)).body;
 const pg1=(await good('ORDERS',a,{},null,undefined,{},'?limit=1')).body;
 const pg2=(await good('ORDERS',a,{},null,undefined,{},'?limit=1&cursor='+encodeURIComponent(pg1.nextCursor))).body;
 check(pg1.items.length===1&&pg2.items.length===1&&pg1.items[0].id!==pg2.items[0].id,'own-order keyset pagination has no missing or repeated records');
 const invalids=[{...orderBody,businessId:id(42)},{...orderBody,guestSessionId:b.context.session.id},{...orderBody,totalAmount:'0.01'},
  {...orderBody,pricingFingerprint:'b'.repeat(64)},{...orderBody,items:[{itemId:item.id,quantity:1,choiceIds:[]}]},{...orderBody,items:[{...orderBody.items[0],unitPrice:'0.01'}]}];
 for(const [i,body] of invalids.entries())check((await call('SUBMIT',a,body)).status>=400,'guest command rejects identity/price/choice manipulation '+i);
 for(const [headers,label] of [[{Origin:'https://other.example.test'},'cross Origin'],[{'X-CSRF-Token':b.context.csrfToken},'other session CSRF'],[{'Idempotency-Key':'bad'},'invalid retry key'],[{'Content-Type':'text/plain'},'non JSON body']])check((await call('SUBMIT',a,orderBody,null,undefined,headers)).status>=400,label+' cannot submit a guest request');
 check((await call('SUBMIT',a,'{broken')).status===400,'malformed JSON cannot create a guest order');
 check((await call('SUBMIT',a,{...orderBody,extra:'x'.repeat(132000)})).status===413,'guest order HTTP body is bounded');
 check((await call('ORDERS',a,{},null,undefined,{},'?businessId='+id(42))).status===400,'list rejects caller tenant filters');
 const rotated=(await issue('VISIT_INVITATION',visit.id,invitation.version)).body;
 const d=await start(link.tableToken);
 check((await call('PAIR',d,{pairingToken:invitation.pairingToken},visit.id)).status===403,'rotating invitation invalidates previous invitation');
 const oldInvitation=(await issue('VISIT_INVITATION',visit.id,visit.version,waiter,inviteKey)).body;
 check(!oldInvitation.active&&oldInvitation.pairingToken===invitation.pairingToken,'issuance retry reconstructs original secret and reports superseded invitation inactive');
 await good('PAIR',d,{pairingToken:rotated.pairingToken},visit.id);
 check((await good('CONTEXT',a)).body.association.canSubmitOrders,'invitation rotation preserves already paired guest access');
 const newLink=(await issue('TABLE_LINK',table.id,link.version)).body;
 check((await call('START',null,{tableToken:link.tableToken})).status===403,'rotating static table link invalidates old session starts');
 check((await issue('TABLE_LINK',table.id,table.version,owner,linkKey)).body.active===false,'old table-link issuance replay never reactivates rotated QR');
 check((await good('CONTEXT',a)).body.session.id===a.context.session.id,'rotating table link preserves existing scoped sessions');
 const eventText=(await admin.query("select jsonb_build_object('requests',(select jsonb_agg(payload) from menumini.workflow_requests),'results',(select jsonb_agg(result) from menumini.service_command_results),'events',(select jsonb_agg(payload) from menumini.outbox_events))::text as t")).rows[0].t;
 check([a.token,b.token,a.context.csrfToken,link.tableToken,invitation.pairingToken,rotated.pairingToken,...startNonces.values()].every(t=>!eventText.includes(t)),'saved requests/results/audit outbox never store plaintext private capabilities');
 const guestClient=new pg.Client({...JSON.parse(process.env.MENU_GUEST_FIXTURE_CONFIG),password:'',ssl:false});await guestClient.connect();
 try{
  for(const sql of ['select * from menumini.orders','select * from menumini.dining_sessions',"select menumini.establish_guest('"+'b'.repeat(64)+"')",'set role menu_runtime']){
   let denied=false;try{await guestClient.query(sql);}catch{denied=true;}check(denied,'limited guest login cannot bypass capability entry: '+sql.split('(')[0]);
  }
 }finally{await guestClient.end();}
 await admin.query("insert into menumini.guest_request_limits values($1,'SESSION_ORDER',date_trunc('minute',clock_timestamp()),9) on conflict(scope_id,kind,bucket) do update set count=9",[a.context.session.id]);
 const last=(await good('SUBMIT',a,orderBody)).body;
 check((await call('SUBMIT',a,orderBody)).status===429,'durable per-session new-order rate guard applies');
 check((await good('SUBMIT',a,orderBody,null,orderKey)).body.id===placed.id,'rate guard does not block resolving a committed exact retry');
 const leave=await good('REVOKE',b,{});check(leave.cookie.includes('Max-Age=0')&&leave.body.revoked,'explicit leave revokes session and clears cookie');
 check((await call('CONTEXT',b)).status===401&&(await call('PAIR',b,{pairingToken:rotated.pairingToken},visit.id)).status===401,'revoked session cannot read or join');
 await admin.query("update menumini.dining_sessions set created_at=now()-interval '13 hours',expires_at=now()-interval '1 hour' where id=$1",[d.context.session.id]);
 check((await call('CONTEXT',d)).status===401,'expired cookie cannot read a session');
 const e=await start(newLink.tableToken);
 for(let n=0;n<17;n++){const joined=await start(newLink.tableToken);await good('PAIR',joined,{pairingToken:rotated.pairingToken},visit.id);}
 check((await call('PAIR',e,{pairingToken:rotated.pairingToken},visit.id)).status===422,'visit joining guard bounds new sessions without granting another guest access');
 await admin.query("update menumini.table_visits set opened_at=now()-interval '10 minutes',pairing_expires_at=now()-interval '1 minute' where id=$1",[visit.id]);
 check((await call('PAIR',e,{pairingToken:rotated.pairingToken},visit.id)).status===403,'expired five-minute invitation cannot pair a fresh guest');
 await good('PAIR',a,{pairingToken:invitation.pairingToken},visit.id,pairKey);
 check((await good('CONTEXT',a)).body.association.visitId===visit.id,'committed pairing retry is recoverable after invitation expiry');
 current=await staff('TRANSITION_ORDER',placed.id,{expectedVersion:current.version,status:'COMPLETED'});
 for(const o of [a2,last]){const accepted=await staff('TRANSITION_ORDER',o.id,{expectedVersion:1,status:'ACCEPTED'});await staff('TRANSITION_ORDER',o.id,{expectedVersion:accepted.version,status:'COMPLETED'});}
 const v=await staff('READ_VISIT',visit.id);await staff('END_VISIT',visit.id,{expectedVersion:v.version});
 check((await good('CONTEXT',a)).body.association.canSubmitOrders===false,'ended seating remains visible with further requests disabled');
 await admin.query("delete from menumini.guest_request_limits where scope_id=$1 and kind='SESSION_ORDER'",[a.context.session.id]);
 check((await call('SUBMIT',a,orderBody)).status===409,'an ended seating cannot accept another order round');
 check((await good('READ_ORDER',a,{},placed.id)).body.status==='COMPLETED','own order remains readable after seating ends until session expiry');
 const v2=await staff('OPEN_STAFF_VISIT',venue,{tableId:table.id});const i2=(await issue('VISIT_INVITATION',v2.id,v2.version)).body;
 check((await call('PAIR',a,{pairingToken:i2.pairingToken},v2.id)).status===403,'old table session cannot inherit a new party seating');
 // Actual local HTTP uses the same cookie resolver, with no injected guest identity.
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;let networkRequests=0;
 async function net(path,method='GET',body,session=null,headers={}){
  networkRequests++;const response=await fetch(origin+'/api/v2'+path,{method,headers:{Origin:origin,Accept:'application/json',...(body?{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()}:{}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.context.csrfToken}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');return {status:response.status,body:value,cookie:response.headers.get('set-cookie')};
 }
 async function netStart(){const r=await net('/dining-sessions','POST',{tableToken:newLink.tableToken,sessionNonce:randomBytes(32).toString('base64url')});assert.equal(r.status,201);return {cookie:r.cookie.split(';')[0],token:r.cookie.split(';')[0].split('=')[1],context:r.body};}
 const f=await netStart(),g=await netStart(),h=await netStart();
 check(f.cookie!==g.cookie,'independent HTTP clients receive distinct opaque session cookies');
 check((await net('/guest/session','GET',null,f)).body.session.id===f.context.session.id,'real HTTP resumes only the presented opaque cookie');
 check((await net('/guest/visits/'+v2.id+'/association','POST',{pairingToken:i2.pairingToken},f)).status===200,'real HTTP accepts valid staff-issued invitation for own table');
 check((await net('/guest/visits/'+v2.id+'/association','POST',{pairingToken:i2.pairingToken},g)).status===200,'second independent HTTP guest joins same visit without inheriting orders');
 const fBody={...orderBody,visitId:v2.id,customerNote:'Fictional HTTP guest F only'};
 const nr=await net('/guest/orders','POST',fBody,f);check(nr.status===201&&nr.body.status==='SUBMITTED','real HTTP persists guest order after cookie, Origin and CSRF checks');
 check((await net('/guest/orders/'+nr.body.id,'GET',null,g)).status===404,'real HTTP blocks another guest order ID');
 check((await net('/guest/orders','GET',null,g)).body.items.length===0,'real HTTP guest list is isolated from other diners');
 check((await net('/guest/orders','POST',fBody,f,{'X-CSRF-Token':g.context.csrfToken})).status===403,'real HTTP rejects CSRF from another anonymous session');
 check((await net('/merchant/branches/'+venue+'/orders','GET',null,f)).status===401,'valid anonymous cookie grants no merchant HTTP access');
 check((await net('/guest/session','GET',null,null,{Cookie:'menu_dining='+f.context.session.id,'X-Guest-Session-Id':f.context.session.id,'X-Business-Id':owner.businessId})).status===401,'real HTTP rejects UUID cookies and forged identity headers');
 const postman=await new Promise((resolveResult,reject)=>{
  const child=spawn('python3',[resolve(root,'../scripts/run-guest-postman-fixture.py')],{cwd:root,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';
  child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v);child.on('error',reject);
  child.on('close',code=>code===0?resolveResult(JSON.parse(stdout)):reject(new Error('Isolated local Postman fixture run failed; see redacted report.')));
  child.stdin.end(JSON.stringify({origin,visitId:v2.id,tableToken:newLink.tableToken,invitation:i2.pairingToken,orderBody:{...fBody,customerNote:'Fictional Postman guest request'}}));
 });
 check(postman.passed,'maintained guest Postman requests complete session, pairing, order tracking and explicit revocation over real local HTTP');
 const projection=(schema,value)=>({schema,value});
 const sanitizedContext=(await good('CONTEXT',a)).body;sanitizedContext.csrfToken='FICTIONAL_CSRF_'+'C'.repeat(27)+'0';
 const cleanLink={...newLink,tableToken:'FICTIONAL_TABLE_'+'T'.repeat(26)+'0'};
 const cleanInvite={...i2,pairingToken:'FICTIONAL_VISIT_'+'P'.repeat(26)+'0'};
 await writeFile(resolve(root,'../docs/contracts/guest-db-examples.json'),JSON.stringify([projection('GuestContext',sanitizedContext),projection('TableGuestLink',cleanLink),projection('VisitInvitation',cleanInvite),projection('GuestOrder',placed),projection('GuestOrderList',(await good('ORDERS',a)).body),projection('ServiceOffer',offer)],null,2)+'\n');
 await admin.query('grant menu_runtime to menu_guest_runtime');
 check((await call('CONTEXT',a)).status===503,'guest pool rejects a login with accidental staff runtime membership');
 await admin.query('revoke menu_runtime from menu_guest_runtime');
 check((await call('CONTEXT',a)).status===200,'guest pool recovers with a clean limited connection after unsafe membership is removed');
 const raceHash=access.hashCapability(e.token);
 console.log(JSON.stringify({guest_result:{passed:cases.length,failed:0,cases},concurrency_fixture:{table:table2.id,tableHash:access.hashCapability(link2.tableToken),visit:v2.id,visitVersion:i2.version,invitation:i2.pairingToken,pairHash:access.hashCapability(h.token),pairCsrf:access.hashCapability(h.context.csrfToken),orderHash:access.hashCapability(f.token),orderCsrf:access.hashCapability(f.context.csrfToken),orderBody:fBody,venue},network_http_requests:networkRequests,postman,restart_cookie_hash:access.hashCapability(a.token)}));
}finally{if(access)await access.closeGuestPool();if(pool)await pool.closeMerchantCatalogPool();await admin.end();await server.close();}
