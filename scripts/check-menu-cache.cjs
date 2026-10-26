/* Exercise the actual worker script with disposable Cache API doubles. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const handlers = {}; const deleted = []; const writes = []; const pending = [];
let privateResponse = false;
const response = () => ({ status: 200, type: 'basic', headers: new Headers(privateResponse ? {'Cache-Control':'no-store'} : {}), clone: response });
const context = {
  URL,
  self: { location: new URL('https://menu.example.test/'), addEventListener: (name,handler) => handlers[name]=handler,
    skipWaiting() {}, clients: { claim() {} } },
  fetch: async () => response(),
  caches: { keys: async () => ['menumini-v1','menumini-public-v2','another-app'],
    delete: async key => deleted.push(key), match: async () => undefined,
    open: async () => ({ addAll: async urls => writes.push(...urls), put: async request => writes.push(request.url) }) }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../MenuMini_1/static/service-worker.js'),'utf8'),context);
const cases=[];
(async () => {
  let activation;
  handlers.activate({ waitUntil(promise) { activation=promise; } }); await activation;
  assert.deepEqual(deleted,['menumini-v1']); cases.push('worker upgrade removes its old private-page cache and preserves unrelated caches');
  for (const route of ['/onboarding','/sign-in','/admin','/api/v2/merchant/context','/visit','/service/rehearsal','/api/v2/guest/session','/api/v2/guest/orders','/fictional-cafe/main?table=1','/']) {
    let handled=false;
    handlers.fetch({ request:new Request('https://menu.example.test'+route),respondWith() { handled=true; } });
    assert.equal(handled,false,route); cases.push('worker never handles private/session-capable HTML or API: '+route);
  }
  for (const route of ['https://elsewhere.example.test/_app/immutable/app.js','https://menu.example.test/_app/immutable/app.js?token=fictional']) {
    let handled=false;
    handlers.fetch({request:new Request(route),respondWith() {handled=true;} });
    assert.equal(handled,false); cases.push('worker ignores external or query-bearing asset request');
  }
  for (const isPrivate of [false,true]) {
    privateResponse=isPrivate; writes.length=0;
    let handled=false;
    handlers.fetch({request:new Request('https://menu.example.test/_app/immutable/app.js'),respondWith(promise) {handled=true; pending.push(promise);} });
    await Promise.all(pending); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(handled,true); assert.equal(writes.length,isPrivate?0:1);
    cases.push(isPrivate?'no-store asset response is never written into Cache API':'public immutable asset can be cached');
  }
  const result={verified_at:new Date().toISOString(),passed:cases.length,failed:0,cases,
    scope:'actual worker routing and cache-ownership logic in Node with Cache API doubles; not browser offline/device acceptance'};
  fs.writeFileSync(path.join(__dirname,'../docs/cache-routing-validation.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
})().catch(error=>{ console.error(error); process.exitCode=1; });
