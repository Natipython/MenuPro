#!/usr/bin/env python3
"""Normalize CLI-generated examples and cookie auth to the reviewed v2 contract."""
from pathlib import Path
import json
import re
import uuid
import yaml

ROOT=Path(__file__).resolve().parents[1]
spec=yaml.safe_load((ROOT/'postman/specs/workflow-v2.openapi.yaml').read_text())
collection=ROOT/'postman/collections/menu-workflow-v2'
variables={'baseUrl':'http://localhost:5174/api/v2','origin':'http://localhost:5174','venueSlug':'fictional-cafe',
           'staffSession':'','diningSession':'','billAccess':'','platformSession':'','csrfToken':''}
fixture_ids={'branchId':101,'visitId':501,'tableId':201,'itemId':601,'orderId':701,'billId':801,
             'claimId':851,'receiptId':861,'refundId':871,'businessId':1,'requestId':881,'quoteId':892,'grantId':899,'requestKey':990}
variables.update({key:f'00000000-0000-4000-8000-{value:012d}' for key,value in fixture_ids.items()})

# CLI --force can leave older requests when path grouping changes. Keep one
# generated request per method/route before normalizing the maintained contract.
grouped={}
for path in collection.rglob('*.request.yaml'):
    request=yaml.safe_load(path.read_text())
    route=re.sub(r':(\w+)',r'{\1}',request['url'].split('}}',1)[1].split('?',1)[0])
    grouped.setdefault((request['method'],route),[]).append(path)
for paths in grouped.values():
    for obsolete in sorted(paths,key=lambda p:(-len(p.parts),str(p)))[1:]: obsolete.unlink()

for request_file in collection.rglob('*.request.yaml'):
    request=yaml.safe_load(request_file.read_text())
    request['url']=request['url'].split('?',1)[0]
    route=re.sub(r':(\w+)',r'{\1}',request['url'].split('}}',1)[1])
    request.pop('queryParams',None)
    op=spec['paths'][route][request['method'].lower()]
    if op['operationId'] in ('getServiceQueue','getCashierBills','listGuestOrders','listPayerClaims'):
        request['queryParams']=[{'key':'limit','value':'50'}]
        request['url']+='?limit=50'
    if op['operationId'] in ('getServiceRequest','getCashierRequest'):
        descriptor=spec['paths'][route+'/cancellation']['post']['requestBody']['content']['application/json']['example']
        request['queryParams']=[{'key':k,'value':v} for k,v in descriptor.items()]
        request['url']+='?operation='+descriptor['operation']+'&resourceId='+descriptor['resourceId']
    request['name']=op['operationId']
    request['description']=op['description']+' Independent fictional scenario; protected operations require matching backend fixtures and ephemeral authenticated sessions. Not a runnable restaurant transaction sequence.'
    request.pop('auth',None)
    headers=[{'key':'Accept','value':'application/json'}]
    if 'requestBody' in op:
        body=op['requestBody']['content']['application/json']['example']
        request['body']={'type':'json','content':json.dumps(body,ensure_ascii=False,indent=2)}
        headers.append({'key':'Content-Type','value':'application/json'})
    unsafe=request['method'] not in ('GET','HEAD')
    stateless=op['operationId'] in ('validateBusinessRegistration','validateSetupDraft','validateWorkspacePreparation')
    if unsafe and not stateless:
        headers.append({'key':'Idempotency-Key','value':str(uuid.uuid5(uuid.NAMESPACE_URL,'menumini:fixture:'+op['operationId']))})
    if op['operationId'] in ('cancelGuestOrderRequest','cancelPayerPaymentRequest','cancelServiceRequest','cancelCashierRequest'):
        for header in headers:
            if header['key']=='Idempotency-Key':header['value']='{{requestKey}}'
    if unsafe:
        headers.append({'key':'Origin','value':'{{origin}}'})
    security=op['security'][0] if op['security'] else {}
    cookies=[]
    for scheme in security:
        if scheme=='csrfToken': headers.append({'key':'X-CSRF-Token','value':'{{csrfToken}}'})
        else:
            definition=spec['components']['securitySchemes'][scheme]
            assert definition['in']=='cookie'
            cookies.append(definition['name']+'={{'+scheme+'}}')
    if cookies: headers.append({'key':'Cookie','value':'; '.join(cookies)})
    request['headers']=headers
    for parameter in request.get('pathVariables',[]): parameter['value']='{{'+parameter['key']+'}}'
    request['scripts']=[{'type':'afterResponse','language':'text/javascript','code':
        'pm.test("Command succeeds for its prepared fixture", () => pm.expect(pm.response.code).to.be.within(200, 299));\n'
        + ('pm.test("Private response is not cached", () => pm.expect(pm.response.headers.get("Cache-Control") || "").to.include("no-store"));\n' if security or stateless else '')
        + 'pm.test("Money fields are exact decimal strings", () => {\n'
          '  function check(v) { if (v && typeof v === "object") Object.keys(v).forEach(k => {\n'
          '    if (/(Amount|Price|Total)$/.test(k) && !(k === "verifiedReceivedAmount" && v[k] === null)) pm.expect(v[k]).to.match(/^(0|[1-9][0-9]{0,9})\\.[0-9]{2}$/);\n'
          '    else check(v[k]); }); }\n  check(pm.response.json());\n});'}]
    if op['operationId']=='validateBusinessRegistration':
        request['scripts'][0]['code']+='\npm.test("Format check is not authentication", () => {\n'
        request['scripts'][0]['code']+='  const b=pm.response.json(); pm.expect(b.nextStep).to.equal("VERIFY_REGISTRANT_PHONE");\n'
        request['scripts'][0]['code']+='  pm.expect(b.valid).to.equal(true); pm.expect(b).not.to.have.property("owner"); pm.expect(b).not.to.have.property("session");\n'
        request['scripts'][0]['code']+='  pm.expect(pm.response.headers.has("Set-Cookie")).to.equal(false);\n});'
    if op['operationId']=='validateSetupDraft':
        request['scripts'][0]['code']+='\npm.test("Draft preparation cannot activate access or publication", () => {\n'
        request['scripts'][0]['code']+='  const b=pm.response.json(); pm.expect(b.mode).to.equal("DRAFT_ONLY");\n'
        request['scripts'][0]['code']+='  pm.expect(b.nextStep).to.equal("VERIFY_BEFORE_LAUNCH"); pm.expect(b).not.to.have.property("branch");\n'
        request['scripts'][0]['code']+='  pm.expect(b).not.to.have.property("session"); pm.expect(b.blockers).to.include("PHONE_VERIFICATION");\n'
        request['scripts'][0]['code']+='  pm.expect(pm.response.headers.has("Set-Cookie")).to.equal(false);\n});'
    if op['operationId']=='validateWorkspacePreparation':
        request['scripts'][0]['code']+='\npm.test("Workspace review cannot grant service or publication", () => {\n'
        request['scripts'][0]['code']+='  const b=pm.response.json(); pm.expect(b.mode).to.equal("PREPARATION_ONLY");\n'
        request['scripts'][0]['code']+='  pm.expect(b).not.to.have.property("profile"); pm.expect(b).not.to.have.property("service");\n'
        request['scripts'][0]['code']+='  pm.expect(b.blockers).to.include("BUSINESS_AUTHORIZATION"); pm.expect(pm.response.headers.has("Set-Cookie")).to.equal(false);\n});'
    # Use the generated v3 layout; replace its arbitrary values with spec examples.
    example_dir=request_file.parent/request['examples']
    example_dir.mkdir(parents=True,exist_ok=True)
    for old in example_dir.glob('*.example.yaml'): old.unlink()
    for code,response in op['responses'].items():
        if not code.startswith('2'): continue
        example={'$kind':'http-example','name':'Fictional committed result '+code,
          'request':{'url':request['url'],'method':request['method']},
          'response':{'statusCode':int(code),'statusText':'Created' if code=='201' else 'OK',
              'headers':[{'key':'Content-Type','value':'application/json'}]+([{'key':'Cache-Control','value':'no-store'}] if security or stateless else []),
              'body':{'type':'json','content':json.dumps(response['content']['application/json']['example'],ensure_ascii=False,indent=2)}}}
        (example_dir/(code+'.example.yaml')).write_text(yaml.safe_dump(example,sort_keys=False,allow_unicode=True))
    request_file.write_text(yaml.safe_dump(request,sort_keys=False,allow_unicode=True))

definition={'$kind':'collection','name':'MenuMini workflow v2 design contract',
 'description':spec['info']['description']+' Auth values are intentionally empty. Do not persist real session values or upload them. Each request is an independent scenario with its own matching fixtures.',
 'variables':[{'key':key,'value':value} for key,value in variables.items()]}
(collection/'.resources/definition.yaml').write_text(yaml.safe_dump(definition,sort_keys=False,allow_unicode=True))
print(f'Prepared {len(list(collection.rglob("*.request.yaml")))} contract requests with reviewed fictional examples; no HTTP calls.')
