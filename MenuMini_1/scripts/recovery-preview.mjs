// Private fixture runner only; never imported by application routes or builds.
import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createServer} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import pg from 'pg';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const path=process.env.MENUMINI_RECOVERY_FIXTURE||'';
assert.ok(path.startsWith('/tmp/menumini-workspace-')&&path.endsWith('/fixture.json')&&process.env.NODE_ENV==='development');
const manifest=JSON.parse(await readFile(path,'utf8'));assert.equal(manifest.marker,'menumini-fictional-command-recovery');const origin=new URL(manifest.http_origin);assert.equal(origin.hostname,'127.0.0.1');
const fixture=JSON.parse(process.env.MENU_MERCHANT_FIXTURE_CONFIG||'{}');assert.equal(fixture.host,manifest.socket);const admin=new pg.Client({...fixture,user:'menu_test',password:'',ssl:false});await admin.connect();
const faults=resolve(dirname(path),'faults.json');const faultPlugin={name:'private-recovery-fault-fixture',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.method!=='POST')return next();const target=(req.url||'').split('?')[0];let mode;
 try{const settings=JSON.parse(await readFile(faults,'utf8'));mode=settings[target];if(mode!=='BEFORE'&&mode!=='AFTER')return next();if(mode==='AFTER'){settings[target]='NONE';await writeFile(faults,JSON.stringify(settings)+'\n',{mode:0o600});}}catch{return next();}
 if(mode==='BEFORE'){res.destroy();return;}
 const write=res.write.bind(res),end=res.end.bind(res);
 // SvelteKit streams JSON through write() before end(). Suppress those chunks so
 // a complete successful body cannot escape before the fixture drops the response.
 res.write=function(...args){if(res.statusCode>=200&&res.statusCode<300){const callback=args.at(-1);if(typeof callback==='function')callback();return true;}return write(...args);};
 res.end=function(...args){if(res.statusCode>=200&&res.statusCode<300){if(!res.headersSent)res.setHeader('Content-Length','256');res.flushHeaders();write('{');setTimeout(()=>res.destroy(),25);return res;}return end(...args);};next();
 });}};
const server=await createServer({root,configFile:false,envDir:false,plugins:[faultPlugin,sveltekit()],server:{host:'127.0.0.1',port:Number(origin.port),strictPort:true}});
const merchant=await server.ssrLoadModule('/src/lib/server/merchant-catalog.ts');const guest=await server.ssrLoadModule('/src/lib/server/guest-access.ts');const service=await server.ssrLoadModule('/src/lib/server/staff-service.ts');const payer=await server.ssrLoadModule('/src/lib/server/payer-access.ts');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');const owner={userId:id(411),businessId:id(41),csrfToken:'FICTIONAL_FIXTURE_STAFF_CSRF'};const branch=(await admin.query("select id from menumini.venues where public_slug='fictional-published-cafe'")).rows[0].id;
await admin.query('begin');await admin.query('set local role menu_platform');await admin.query("select set_config('menu.user_id',$1,true)",[id(99)]);await admin.query("select menumini.apply_plan($1,'MINI',1,true,now(),now()+interval '1 month','FICTIONAL-RECOVERY-PREVIEW')",[owner.businessId]);await admin.query('commit');
await admin.query(`update menumini.venues set ordering_enabled=true,settings=settings||'{"pricing":{"confirmed":true,"taxMode":"NONE","taxRateBps":0,"serviceRateBps":0,"taxOnService":false}}'::jsonb where id=$1`,[branch]);
await admin.query("insert into menumini.payment_accounts(id,merchant_id,provider,account_identifier,holder_name,ownership_verified_at) values($1,$2,'CBE','FICTIONAL-DO-NOT-PAY-RECOVERY','Fictional recovery cafe',now())",[id(9891),owner.businessId]);await admin.query('insert into menumini.venue_payment_accounts values($1,$2,$3)',[owner.businessId,branch,id(9891)]);
const staff=(op,resource,body={})=>service.serviceCommand(owner,resource,op,body,randomUUID());const table=await staff('CREATE_TABLE',branch,{label:'Fictional recovery table'});const visit=await staff('OPEN_STAFF_VISIT',branch,{tableId:table.id});const link=await guest.issueGuestCapability(owner,table.id,'TABLE_LINK',table.version,randomUUID());
let invitation=await guest.issueGuestCapability(owner,visit.id,'VISIT_INVITATION',visit.version,randomUUID());const grants=new Map();let timer,polling=false;
async function poll(){if(polling)return;polling=true;try{
 const orders=(await admin.query("select id,version,status from menumini.orders where visit_id=$1 order by created_at,id",[visit.id])).rows;
 for(const order of orders)if(order.status==='SUBMITTED')await staff('TRANSITION_ORDER',order.id,{expectedVersion:order.version,status:'ACCEPTED'});
 const sessions=(await admin.query('select guest_session_id id from menumini.visit_guests where visit_id=$1 order by guest_session_id',[visit.id])).rows;
 if(!sessions.length&&Date.parse(invitation.expiresAt)-Date.now()<60000){const version=(await admin.query('select version from menumini.table_visits where id=$1',[visit.id])).rows[0].version;invitation=await guest.issueGuestCapability(owner,visit.id,'VISIT_INVITATION',version,randomUUID());}
 for(const s of sessions)if(!grants.has(s.id)){const bill=await staff('READ_BILL',visit.billId);grants.set(s.id,await payer.payerStaffCommand(owner,visit.billId,'ISSUE',{guestSessionId:s.id,expectedBillVersion:bill.version},randomUUID()));}
 const state={...manifest,branchId:branch,visitId:visit.id,billId:visit.billId,tableToken:link.tableToken,invitation:visit.id+'.'+invitation.pairingToken,grantCodes:[...grants].map(([session,g])=>({deviceCode:session.replaceAll('-','').slice(-8).toUpperCase(),accessToken:g.accessToken})),
  orders:(await admin.query('select id,status,total_amount from menumini.orders where visit_id=$1 order by id',[visit.id])).rows,
  claims:(await admin.query('select id,status,reported_amount from menumini.bill_payment_claims where bill_id=$1 order by id',[visit.billId])).rows,
  cancellations:(await admin.query('select operation,request_key from menumini.command_cancellations where venue_id=$1 order by request_key',[branch])).rows};
 await writeFile(path+'.tmp',JSON.stringify(state,null,2)+'\n',{mode:0o600});await rename(path+'.tmp',path);
 }catch{process.stderr.write('Fictional recovery fixture could not refresh; inspect private test diagnostics.\n');}finally{polling=false;}}
await poll();await server.listen();server.printUrls();timer=setInterval(poll,1000);let stopping=false;
async function stop(){if(stopping)return;stopping=true;clearInterval(timer);while(polling)await new Promise(r=>setTimeout(r,20));await guest.closeGuestPool();await merchant.closeMerchantCatalogPool();await admin.end();await server.close();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
