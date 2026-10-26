#!/usr/bin/env python3
"""Real HTTP preparation validation and closed merchant boundaries."""
from pathlib import Path
from copy import deepcopy
from datetime import datetime,timezone
import argparse,http.client,json
from urllib.parse import urlparse
import yaml
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry,Resource
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(); parser.add_argument('--origin',default='http://127.0.0.1:5196'); args=parser.parse_args()
origin=urlparse(args.origin); assert origin.hostname in ('127.0.0.1','localhost') and origin.scheme=='http'
spec=yaml.safe_load((ROOT/'postman/specs/workflow-v2.openapi.yaml').read_text())
base={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:menumini:workspace','components':spec['components']}
registry=Registry().with_resource(base['$id'],Resource.from_contents(base))
validator=lambda name:Draft202012Validator({'$ref':base['$id']+'#/components/schemas/'+name},registry=registry,format_checker=FormatChecker())
example=spec['paths']['/onboarding/workspace-validation']['post']['requestBody']['content']['application/json']['example']
cases=[]; requests=0
def call(method,path,body=None,headers=None,chunked=False):
    global requests
    conn=http.client.HTTPConnection(origin.hostname,origin.port,timeout=20)
    h={'Origin':args.origin,'Content-Type':'application/json',**(headers or {})}
    raw=json.dumps(body,ensure_ascii=False).encode() if isinstance(body,(dict,list)) else body
    try:
        conn.request(method,path,body=raw,headers=h,encode_chunked=chunked); response=conn.getresponse(); data=response.read(); requests+=1
        assert response.getheader('Cache-Control')=='no-store'
        assert response.getheader('Set-Cookie') is None
        return response.status,data,response.getheader('Content-Type') or ''
    finally: conn.close()
def check_validation(body,status,label,headers=None,chunked=False):
    code,raw,content_type=call('POST','/api/v2/onboarding/workspace-validation',body,headers,chunked)
    assert code==status,(label,code,raw[:500]); value=json.loads(raw)
    validator('WorkspaceCheck' if status==200 else 'Problem').validate(value)
    assert not any(k in value for k in ['profile','menu','service','owner','manager','session'])
    assert ('application/json' if status==200 else 'application/problem+json') in content_type
    cases.append(label); return value
value=check_validation(example,200,'valid workspace returns only counts and required steps')
assert value['mode']=='PREPARATION_ONLY' and 'BUSINESS_AUTHORIZATION' in value['blockers']
mutations=[
 ('verification assertion',lambda v:v.update(phoneVerified=True)),
 ('private registration contacts',lambda v:v.update(owner={'phone':'FICTIONAL_PRIVATE_CONTACT'})),
 ('ordering activation',lambda v:v['service'].update(orderingEnabled=True)),
 ('staff permission assertion',lambda v:v['service']['staffing'].update(permissions=['payments.record'])),
 ('receiving account import',lambda v:v['service'].update(receivingAccount={'number':'fictional'})),
 ('duplicate table labels',lambda v:v['service'].update(tableLabels=['Table 1',' table 1 '])),
 ('duplicate payment methods',lambda v:v['service'].update(paymentMethods=['CASH','CASH'])),
 ('unsupported payment method',lambda v:v['service'].update(paymentMethods=['AUTO_PAID'])),
 ('numeric menu price',lambda v:v['menu']['sections'][0]['items'][0].update(basePrice=60.5)),
 ('three-decimal menu price',lambda v:v['menu']['sections'][0]['items'][0].update(basePrice='60.555')),
 ('duplicate menu identities',lambda v:v['menu']['sections'][0]['items'][0].update(id=v['menu']['sections'][0]['id'])),
 ('ambiguous hours',lambda v:v['profile']['branch']['hours'].__setitem__(0,{'day':0,'status':'OPEN','opens':'07:00','closes':'07:00','overnight':False}))
]
for label,mutate in mutations:
    body=deepcopy(example); mutate(body); check_validation(body,422,label+' rejected')
check_validation(example,403,'cross-origin preparation request rejected',{'Origin':'https://example.test'})
check_validation(example,415,'non-JSON preparation request rejected',{'Content-Type':'text/plain'})
check_validation(b'{broken',400,'malformed JSON rejected')
check_validation(b'\xff',400,'invalid UTF-8 rejected')
check_validation(b' '*1179649,413,'oversized body rejected')
check_validation(iter([b' '*400000]*3),413,'oversized streamed body rejected without cancelling response socket',chunked=True)
deep=b'{"format":"menumini-workspace-draft","version":1,"planPreference":"FREE","profile":{"unknown":'+b'{"x":'*12000+b'0'+b'}'*12000+b'},"menu":{},"service":{}}'
check_validation(deep,422,'deep unsupported content yields a controlled validation error')
menu_only=deepcopy(example); menu_only['profile']['branch']['serviceMode']='MENU_ONLY'; menu_only['planPreference']='FREE'
value=check_validation(menu_only,200,'browsing-only preparation does not require restaurant payment setup')
assert 'PAID_PLAN_REQUIRED' not in value['blockers'] and 'ORDERING_WORKFLOW' not in value['blockers']
free_ordering=deepcopy(example); free_ordering['planPreference']='FREE'
value=check_validation(free_ordering,200,'Free ordering preference stays blocked')
assert 'PAID_PLAN_REQUIRED' in value['blockers']
prefix='/api/v2/merchant/branches/00000000-0000-4000-8000-000000000101/'
for method,path in [('GET','menu-draft'),('PUT','menu-draft'),('GET','profile-draft'),('PUT','profile-draft'),('POST','menu-publications'),('GET','service-draft'),('PUT','service-draft'),('GET','readiness')]:
    status,raw,ctype=call(method,prefix+path,{} if method!='GET' else None,{
      'Cookie':'menu_staff_session=FICTIONAL_SPOOFED_SESSION','X-User-ID':'00000000-0000-4000-8000-000000000411',
      'X-Business-ID':'00000000-0000-4000-8000-000000000041','X-CSRF-Token':'FICTIONAL_TOKEN'})
    assert status==401 and json.loads(raw)['code']=='AUTHENTICATION_REQUIRED'
    validator('Problem').validate(json.loads(raw)); cases.append(method+' '+path+' rejects spoofed client identity')
status,html,_=call('GET','/workspace')
assert status==200 and b'Prepare them together' in html; cases.append('workspace page serves no-store preparation UI')
result={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':requests,'cases':cases,
        'scope':'actual local HTTP; preparation is stateless and eight private boundaries remain closed; no authenticated success or real-device claim'}
(ROOT/'docs/workspace-http-validation.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
