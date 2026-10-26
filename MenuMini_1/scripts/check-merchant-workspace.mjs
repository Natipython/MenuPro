import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=JSON.parse(process.env.MENU_MERCHANT_FIXTURE_CONFIG || '{}');
assert.ok(fixture.host?.startsWith('/tmp/menumini-workspace-'));
const admin=new pg.Client({ ...fixture,user:'menu_test',password:'',ssl:false }); await admin.connect();
const server=await createServer({ root,configFile:false,envDir:false,plugins:[sveltekit()] });
const cases=[]; const check=(v,label)=>{ assert.ok(v,label); cases.push(label); };
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner={ userId:id(411),businessId:id(41),csrfToken:'FICTIONAL_CSRF_SERVER_TEST_ONLY' };
const other={ ...owner,userId:id(412),businessId:id(42) };
const editor={ ...owner,userId:id(413) }; const waiter={ ...owner,userId:id(414) };
const venue=(await admin.query("select id from menumini.venues where public_slug='fictional-published-cafe'")).rows[0].id;
const publicMenu=async()=> (await admin.query("select menumini.read_public_menu('fictional-published-cafe') as menu")).rows[0].menu;
let catalog;
try {
  const model=await server.ssrLoadModule('/src/lib/workspace/model.ts');
  catalog=await server.ssrLoadModule('/src/lib/server/merchant-catalog.ts');
  const http=await server.ssrLoadModule('/src/lib/server/catalog-http.ts');
  const setup=JSON.parse(await readFile(resolve(root,'database/tests/preparation-draft.json'),'utf8'));
  const prepared=model.workspaceFromSetup(setup);
  check(model.validateWorkspace(prepared).errors.length===0,'setup preparation carries into the richer workspace without contacts');
  check(model.validateWorkspace({ ...prepared,phoneVerified:true }).errors.length>0,'workspace cannot assert verified identity');
  check(model.validateService({ ...prepared.service,orderingEnabled:true }).length>0,'service preparation cannot activate ordering');
  check(model.validateService({ ...prepared.service,tableLabels:['Table 1',' table 1 '] }).length>0,'trimmed case-insensitive planned table duplicates rejected');
  check(model.validateService({ ...prepared.service,paymentMethods:['CASH','CASH'] }).length>0,'duplicate intended payment methods rejected');
  check(model.normalizeAmount('60.5')==='60.50' && model.normalizeAmount('-5',true)==='-5.00','exact ETB input normalized without floating-point rounding');
  const validMenu=structuredClone(prepared.menu); const item=validMenu.sections[0].items[0];
  item.modifiers=[{ id:id(5100),label:'Size',mode:'SINGLE_SELECT',minSelections:1,maxSelections:1,
    choices:[{id:id(5101),label:'Regular',priceDelta:'0.00',isAvailable:true},{id:id(5102),label:'Large',priceDelta:'10.00',isAvailable:true}] }];
  check(model.validateCatalog(validMenu).length===0,'valid required item options accepted');
  for (const [label,mutate] of [
    ['numeric price',v=>v.sections[0].items[0].basePrice=60.5],
    ['three decimal places',v=>v.sections[0].items[0].basePrice='60.555'],
    ['duplicate catalog identities',v=>v.sections[0].items[0].modifiers[0].choices[0].id=v.sections[0].id],
    ['unavailable required choices',v=>v.sections[0].items[0].modifiers[0].choices.forEach(c=>c.isAvailable=false)],
    ['negative possible total',v=>v.sections[0].items[0].modifiers[0].choices[0].priceDelta='-70.00'],
    ['overflow possible total',v=>v.sections[0].items[0].basePrice='9999999999.99'],
    ['single choice maximum two',v=>v.sections[0].items[0].modifiers[0].maxSelections=2]
  ]) { const v=structuredClone(validMenu); mutate(v); check(model.validateCatalog(v).length>0,label+' rejected'); }
  check(model.validateWorkspace(prepared).check.blockers.includes('VERIFIED_STAFF_ACCESS'),'planned staffing does not remove actual staff-verification gate');
  check(await http.verifiedMerchantIdentity()===null,'public server identity adapter remains closed');
  async function request(operation,body,principal=owner,key=crypto.randomUUID(),headers={}) {
    const write=!operation.startsWith('READ_'); const url=new URL('http://127.0.0.1:5196/api/v2/merchant/branches/'+venue+'/test');
    const r=new Request(url,{method:write?'POST':'GET',headers:{Origin:url.origin,'Content-Type':'application/json',
      'X-CSRF-Token':principal?.csrfToken || '', 'Idempotency-Key':key,...headers},...(write?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
    const response=await http.merchantCatalogResponse(r,url,venue,operation,principal);
    check(response.headers.get('cache-control')==='no-store' && !response.headers.has('set-cookie'),'adapter '+operation+' response is private and creates no session');
    return { status:response.status,body:await response.json() };
  }
  check((await request('READ_MENU',null,null)).status===401,'no identity cannot enter command adapter');
  let r=await request('READ_MENU'); check(r.status===200 && r.body.version===2,'owner reads the persistent menu through actual server adapter');
  const baseline=r.body; const liveBefore=await publicMenu();
  r=await request('READ_SERVICE'); check(r.status===404,'missing private service draft is a safe 404');
  const service={ tableLabels:['Table 1'],staffing:{orders:'OWNER',preparation:'STAFF',payments:'OWNER'},paymentMethods:['CASH','BANK_TRANSFER'],pricing:'UNCONFIRMED' };
  const saveKey=crypto.randomUUID();
  const saved=await request('SAVE_SERVICE',{expectedVersion:0,content:service},owner,saveKey);
  check(saved.status===200 && saved.body.version===1,'service draft is persisted with creation version zero');
  const replay=await request('SAVE_SERVICE',{expectedVersion:0,content:service},owner,saveKey);
  check(JSON.stringify(saved)===JSON.stringify(replay),'same service command retry returns its original response');
  r=await request('SAVE_SERVICE',{expectedVersion:0,content:{...service,pricing:'NO_ADDED_CHARGES'}},owner,saveKey);
  check(r.status===409 && r.body.code==='IDEMPOTENCY_CONFLICT','same key with changed service content returns an idempotency conflict');
  r=await request('SAVE_SERVICE',{expectedVersion:0,content:service}); check(r.status===409 && r.body.code==='VERSION_CONFLICT','stale service draft cannot overwrite a newer version');
  for (const [operation,principal] of [['READ_MENU',other],['READ_SERVICE',other],['READ_READINESS',other],['READ_MENU',waiter],['SAVE_SERVICE',editor]]) {
    r=await request(operation,{expectedVersion:1,content:service},principal); check(r.status===403,'cross-business/role access rejected: '+operation+' '+principal.userId);
  }
  r=await request('READ_MENU',null,editor); check(r.status===200,'editor can read only its authorized catalog');
  const readiness=await request('READ_READINESS');
  check(readiness.status===200 && readiness.body.mode==='PREPARATION_ONLY' && readiness.body.serviceDraftVersion===1,'readiness is an aggregate projection, not launch authority');
  check(!readiness.body.facts.subscriptionOrderingActive,'real Free capability remains inactive despite ordering preparation');
  check(readiness.body.facts.activeTableCount===0 && !readiness.body.facts.verifiedReceivingAccount,'planned labels and transfers do not create actual tables or verified accounts');
  check(JSON.stringify(await publicMenu())===JSON.stringify(liveBefore),'saving service preparation cannot change the public menu');
  const branchState=(await admin.query('select m.plan,v.ordering_enabled from menumini.venues v join menumini.merchants m on m.id=v.merchant_id where v.id=$1',[venue])).rows[0];
  check(branchState.plan==='FREE' && !branchState.ordering_enabled,'service draft cannot activate subscription or branch ordering');
  for (const bad of [{...service,orderingEnabled:true},{...service,tableLabels:['A',' a ']},{...service,paymentMethods:['CASH','CASH']}]) {
    await assert.rejects(catalog.catalogCommand(owner,venue,'SAVE_SERVICE',{expectedVersion:1,content:bad},crypto.randomUUID()),e=>e.status===422);
    cases.push('database independently rejects invalid service preparation');
  }
  check((await request('READ_SERVICE')).body.version===1,'rejected service commands leave the stored version unchanged');
  for (const [label,headers,body,status] of [
    ['wrong Origin',{Origin:'https://example.test'},{expectedVersion:1,content:service},403],
    ['wrong CSRF',{'X-CSRF-Token':'spoofed'},{expectedVersion:1,content:service},403],
    ['missing retry key',{'Idempotency-Key':''},{expectedVersion:1,content:service},400],
    ['wrong content type',{'Content-Type':'text/plain'},{expectedVersion:1,content:service},415],
    ['oversized body',{},' '.repeat(19000),413],
    ['malformed JSON',{},'{broken',400],
    ['client tenant assertion',{}, {expectedVersion:1,content:service,businessId:id(42)},422]
  ]) { r=await request('SAVE_SERVICE',body,owner,crypto.randomUUID(),headers); check(r.status===status,label+' rejected before database mutation'); }
  const menu=structuredClone(baseline.content); menu.sections[0].items[0].basePrice='88.25';
  menu.sections[0].items[0].modifiers=structuredClone(item.modifiers);
  const newMenu=await request('SAVE_MENU',{expectedVersion:2,content:menu}); check(newMenu.status===200 && newMenu.body.version===3,'richer menu saves through validated server command');
  check(JSON.stringify(await publicMenu())===JSON.stringify(liveBefore),'menu preparation edit stays separate from the publication');
  const profile=(await request('READ_PROFILE')).body; profile.content.branch.publicName='Fictional Workspace Cafe'; profile.content.branch.serviceMode='DINE_IN';
  r=await request('SAVE_PROFILE',{expectedVersion:2,content:profile.content},editor); check(r.status===403,'editor cannot change public branch identity');
  const newProfile=await request('SAVE_PROFILE',{expectedVersion:2,content:profile.content}); check(newProfile.status===200 && newProfile.body.version===3,'owner saves public branch profile through server command');
  const orderingReadiness=await request('READ_READINESS');
  check(orderingReadiness.body.blockers.includes('SUBSCRIPTION_ACTIVATION') && orderingReadiness.body.blockers.includes('ORDERING_WORKFLOW')
    && orderingReadiness.body.blockers.includes('PAYMENT_WORKFLOW'),'dine-in readiness keeps capability and unfinished transaction gates blocked');
  const pubKey=crypto.randomUUID(); const pub=await request('PUBLISH',{draftVersion:3,profileVersion:3},owner,pubKey);
  check(pub.status===201 && pub.body.venueName==='Fictional Workspace Cafe' && pub.body.content.sections[0].items[0].basePrice==='88.25','publication adapter switches the actual public menu to reviewed values');
  check(pub.body.content.sections[0].items[0].availableNow===liveBefore.content.sections[0].items[0].availableNow,'publication preserves live sold-out override');
  const again=await request('PUBLISH',{draftVersion:3,profileVersion:3},owner,pubKey);
  check(JSON.stringify(pub)===JSON.stringify(again),'publication retry returns the original committed public projection');
  const projections=[{schema:'ServiceDraft',value:saved.body},{schema:'BranchReadiness',value:orderingReadiness.body}];
  await writeFile(resolve(root,'../docs/contracts/workspace-db-examples.json'),JSON.stringify(projections,null,2)+'\n');
  const raw=new pg.Client({...fixture,password:'',ssl:false}); await raw.connect();
  try {
    await assert.rejects(raw.query('update menumini.service_drafts set version=999'),e=>e.code==='42501'); cases.push('runtime has no direct service-draft mutation permission');
    await raw.query("select set_config('menu.merchant_id',$1,false),set_config('menu.user_id',$2,false)",[owner.businessId,owner.userId]);
    check((await raw.query('select * from menumini.outbox_events')).rows.length===0,'interactive runtime cannot see any committed outbox rows even in owner scope');
    await assert.rejects(raw.query('update menumini.outbox_events set attempts=999'),e=>e.code==='42501'); cases.push('interactive runtime cannot edit worker outbox');
  } finally { await raw.end(); }
  await admin.query('alter role menu_workspace_runtime bypassrls');
  try { r=await request('READ_MENU'); check(r.status===503,'an unsafe bypass-RLS connection is rejected without leaking database errors'); }
  finally { await admin.query('alter role menu_workspace_runtime nobypassrls'); }
  check((await request('READ_MENU',null,other)).status===403,'pool reuse cannot inherit previous business authority');
  await writeFile('/tmp/menumini-workspace-example.json',JSON.stringify({...prepared,menu:validMenu,service},null,2)+'\n');
  console.log(JSON.stringify({workspace_result:{passed:cases.length,failed:0,cases,database_projection_examples:2}}));
} finally { await catalog?.closeMerchantCatalogPool(); await server.close(); await admin.end(); }
