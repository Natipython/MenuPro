#!/usr/bin/env python3
"""Exercise actual local registration validation; no SMS/auth/database writes."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlparse
from copy import deepcopy
from datetime import datetime,timezone
import argparse,json,yaml
from http.client import HTTPConnection
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry,Resource

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(); parser.add_argument('--base-url',default='http://127.0.0.1:5186')
origin=parser.parse_args().base_url.rstrip('/')
assert urlparse(origin).hostname in ('localhost','127.0.0.1','::1'),'This checker is local-only.'
spec=yaml.safe_load((ROOT/'postman/specs/workflow-v2.openapi.yaml').read_text())
base={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:menu:http-check','components':spec['components']}
registry=Registry().with_resource(base['$id'],Resource.from_contents(base))
def validate(name,data):
    Draft202012Validator({'$ref':base['$id']+'#/components/schemas/'+name},registry=registry,format_checker=FormatChecker()).validate(data)
input=spec['paths']['/onboarding/validation']['post']['requestBody']['content']['application/json']['example']
cases=[]
def send(body,status,label,*,request_origin=origin,content_type='application/json',raw=False):
    payload=body.encode() if raw else json.dumps(body).encode()
    request=Request(origin+'/api/v2/onboarding/validation',data=payload,method='POST',headers={'Origin':request_origin,'Content-Type':content_type})
    try: response=urlopen(request,timeout=15)
    except HTTPError as error: response=error
    assert response.status==status,(label,response.status)
    assert response.headers.get('Cache-Control')=='no-store',label
    assert not response.headers.get('Set-Cookie'),label
    result=json.loads(response.read())
    validate('RegistrationCheck' if status==200 else 'Problem',result)
    assert not {'owner','manager','phone','email','session','accessToken'}&result.keys(),label
    cases.append(label); return result

owner=send(input,200,'separate owner and manager with no email pass real HTTP validation')
assert owner['requiredVerifications']==['REGISTRANT_PHONE','MANAGER_INVITATION_ACCEPTANCE']
single={k:v for k,v in input.items() if k!='manager'}; single['ownerIsManager']=True
single['owner']['phone']='0900000011'
assert send(single,200,'owner who manages the business needs no duplicate manager or email')['requiredVerifications']==['REGISTRANT_PHONE']
manager=deepcopy(input); manager['registrantRole']='MANAGER'
assert send(manager,200,'manager-led registration explicitly requires owner verification and approval')['requiredVerifications']==['REGISTRANT_PHONE','OWNER_PHONE','OWNER_APPROVAL']
bad=deepcopy(input); bad['manager']['phone']='0900000011'
assert any(e['code']=='DISTINCT_PEOPLE_NEED_DISTINCT_PHONES' for e in send(bad,422,'same phone in local and international form cannot represent separate people')['errors'])
bad=deepcopy(input); bad['owner']['email']='not-an-email'
send(bad,422,'nonempty invalid optional email rejected')
bad=deepcopy(input); bad['owner']['phone']='abc'
send(bad,422,'invalid phone format rejected')
send({**input,'businessName':'   '},422,'whitespace-only legal business name rejected')
send({**input,'businessTypeId':'mini-warm-habesha'},422,'visual theme rejected as a business type')
send({**input,'ownerIsManager':True},422,'duplicate hidden manager cannot bypass same-person rule')
send({**single,'registrantRole':'MANAGER'},422,'same-person registration cannot assert a separate manager identity')
send({**input,'authorityConfirmed':False},422,'unconfirmed registration authority rejected')
send({**input,'role':'PLATFORM_ADMIN'},422,'client cannot add an authority field')
send(input,403,'cross-origin contact submission rejected',request_origin='https://example.test')
send(input,415,'non-JSON contact submission rejected',content_type='text/plain')
send('{',400,'malformed JSON rejected without echoing submitted details',raw=True)
send('x'*16385,413,'oversized body rejected before JSON parsing',raw=True)
host=urlparse(origin)
connection=HTTPConnection(host.hostname,host.port,timeout=15)
connection.request('POST','/api/v2/onboarding/validation',body=iter([b'x'*8192,b'x'*8192,b'x']),
 headers={'Origin':origin,'Content-Type':'application/json','Transfer-Encoding':'chunked'},encode_chunked=True)
response=connection.getresponse()
assert response.status==413 and response.headers.get('Cache-Control')=='no-store'
validate('Problem',json.loads(response.read())); connection.close()
cases.append('chunked oversized body is bounded without aborting the error response')
send([],422,'non-object body rejected')
catalog=json.loads((ROOT/'templates/index.json').read_text())['templates']
assert [(t['id'],t['name']) for t in catalog]==[(t['id'],t['name']) for t in json.loads((ROOT/'MenuMini_1/src/lib/onboarding/business-types.json').read_text())]
assert {t['id'] for t in catalog}==set(spec['components']['schemas']['RegistrationInput']['properties']['businessTypeId']['enum'])
cases.append('all 24 business IDs and labels match the existing source registry and contract')
for route in ('/onboarding','/sign-in'):
    with urlopen(origin+route,timeout=15) as response:
        assert response.status==200 and response.headers.get('Cache-Control')=='no-store',route
    cases.append(route+' page has no-store response')
result={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':20,
 'cases':cases,'scope':'local HTTP validation and page privacy headers only; no verification messages, real login, business creation or persistence'}
(ROOT/'docs/onboarding-http-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
