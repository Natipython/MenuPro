#!/usr/bin/env python3
"""Exercise the real stateless setup handler with fictional drafts; local-only."""
from copy import deepcopy
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlparse
from http.client import HTTPConnection
import argparse, json, uuid, yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(); parser.add_argument('--base-url', default='http://127.0.0.1:5186')
origin = parser.parse_args().base_url.rstrip('/')
host = urlparse(origin)
assert host.hostname in ('localhost', '127.0.0.1', '::1'), 'Local targets only.'
spec = yaml.safe_load((ROOT / 'postman/specs/workflow-v2.openapi.yaml').read_text())
base = {'$schema':'https://json-schema.org/draft/2020-12/schema', '$id':'urn:menu:setup-http', 'components':spec['components']}
registry = Registry().with_resource(base['$id'], Resource.from_contents(base))
def validate(name, value):
    Draft202012Validator({'$ref':base['$id']+'#/components/schemas/'+name}, registry=registry, format_checker=FormatChecker()).validate(value)
draft = spec['paths']['/onboarding/setup-validation']['post']['requestBody']['content']['application/json']['example']
cases = []; requests = 0
def send(value, status, label, *, request_origin=origin, content_type='application/json', raw=False):
    global requests
    payload = value.encode() if raw else json.dumps(value, ensure_ascii=False).encode()
    request = Request(origin+'/api/v2/onboarding/setup-validation', data=payload, method='POST',
                      headers={'Origin':request_origin, 'Content-Type':content_type})
    try: response = urlopen(request, timeout=15)
    except HTTPError as error: response = error
    requests += 1
    assert response.status == status, (label, response.status)
    assert response.headers.get('Cache-Control') == 'no-store', label
    assert response.headers.get('Referrer-Policy') == 'no-referrer', label
    assert not response.headers.get('Set-Cookie'), label
    result = json.loads(response.read()); validate('SetupCheck' if status == 200 else 'Problem', result)
    assert not {'branch', 'menu', 'owner', 'manager', 'phone', 'email', 'session', 'accessToken'} & result.keys(), label
    if status == 200: assert result['mode'] == 'DRAFT_ONLY' and 'PHONE_VERIFICATION' in result['blockers'], label
    cases.append(label); return result

result = send(draft, 200, 'valid Mini preference produces draft-only blockers without activation')
assert result['summary'] == {'sectionCount':1, 'itemCount':1, 'availableItemCount':1}
free = deepcopy(draft); free['planPreference']='FREE'; free['branch']['serviceMode']='MENU_ONLY'
assert 'SUBSCRIPTION_ACTIVATION' not in send(free, 200, 'Free browsing draft does not need billing or staff setup')['blockers']
send({**draft, 'planPreference':'PRO'}, 200, 'Pro preference remains draft interest with no entitlement')
empty = deepcopy(free); empty['menu']['sections'][0]['items']=[]
assert 'MENU_ITEMS' in send(empty, 200, 'empty menu can be prepared but publication readiness is blocked')['blockers']
unavailable = deepcopy(free); unavailable['menu']['sections'][0]['items'][0]['available']=False
assert 'AVAILABLE_ITEMS' in send(unavailable, 200, 'all unavailable items leave a publication readiness blocker')['blockers']
for price in (60.5, '60.5', '060.50', '6e1', '-1.00', '60,50', '60.005'):
    invalid = deepcopy(draft); invalid['menu']['sections'][0]['items'][0]['price']=price
    send(invalid, 422, 'invalid exact-money input rejected: '+str(price))
zero = deepcopy(draft); zero['menu']['sections'][0]['items'][0]['price']='0.00'
send(zero, 200, 'explicit complimentary item accepted without invented zero price')
for extra in ({'owner':{'phone':'0900000011'}}, {'phoneVerified':True}, {'branchLimit':3}, {'session':'fictional'}, {'branches':[draft['branch']]*3}):
    send({**draft, **extra}, 422, 'unsupported contact/access/capacity field rejected: '+next(iter(extra)))
invalid=deepcopy(draft); invalid['menu']['sections'][0]['items'][0]['choiceGroups']=[]
send(invalid, 422, 'unsupported template item options cannot silently enable features')
invalid=deepcopy(draft); invalid['menu']['sections'][0]['items'].append(deepcopy(invalid['menu']['sections'][0]['items'][0]))
send(invalid, 422, 'duplicate item IDs rejected')
invalid=deepcopy(draft); invalid['menu']['sections'][0]['items'][0]['id']=invalid['menu']['sections'][0]['id']
send(invalid, 422, 'item ID cannot collide with section ID')
invalid=deepcopy(draft); invalid['menu']['sections'][0]['items'][0]['name']='   '
send(invalid, 422, 'whitespace-only item name rejected')
invalid=deepcopy(draft); invalid['branch']['landmark']='   '
send(invalid, 422, 'branch needs a practical address or landmark')
invalid=deepcopy(draft); invalid['branch']['publicPhone']='wrong'
send(invalid, 422, 'invalid optional public phone rejected')
invalid=deepcopy(draft); invalid['branch']['hours'][1]['day']=0
send(invalid, 422, 'duplicate day cannot replace a missing day')
invalid=deepcopy(draft); invalid['branch']['hours'][0]={'day':0,'status':'CLOSED','opens':'07:00'}
send(invalid, 422, 'closed day cannot include opening times')
invalid=deepcopy(draft); invalid['branch']['hours'][0]={'day':0,'status':'OPEN','opens':'18:00','closes':'02:00','overnight':False}
send(invalid, 422, 'overnight service needs explicit next-day flag')
invalid['branch']['hours'][0]['overnight']=True
send(invalid, 200, 'explicit overnight opening hours accepted')
invalid['branch']['hours'][0]['closes']='18:00'
send(invalid, 422, 'equal opening and closing times do not silently mean 24 hours')
invalid['branch']['hours'][0]={'day':0,'status':'OPEN','opens':'07:00','closes':'21:00','overnight':True}
send(invalid, 422, 'daytime service cannot claim next-day closure')
invalid['branch']['hours'][0]['overnight']=False
send(invalid, 200, 'explicit same-day opening hours accepted')
for changes, label in (({'currency':'USD'},'currency'), ({'timezone':'UTC'},'time zone'), ({'serviceMode':'DELIVERY'},'delivery capability')):
    invalid=deepcopy(draft); invalid['branch'].update(changes); send(invalid, 422, 'unsupported '+label+' rejected')
invalid=deepcopy(draft); invalid['menu']['themeId']=draft['businessTypeId']
send(invalid, 422, 'business type cannot stand in for visual theme')
for count, status in ((200,200), (201,422)):
    invalid=deepcopy(draft); item=invalid['menu']['sections'][0]['items'][0]
    invalid['menu']['sections']=[{'id':str(uuid.uuid4()),'name':'Section '+str(index),
      'items':[{**item,'id':str(uuid.uuid4())} for _ in range(min(50,count-index*50))]} for index in range((count+49)//50)]
    send(invalid, status, 'total menu item limit checked at '+str(count))
send(draft,403,'cross-origin draft submission rejected',request_origin='https://example.test')
send(draft,403,'missing origin rejected',request_origin='')
send(draft,415,'non-JSON draft rejected',content_type='text/plain')
send('{',400,'malformed JSON rejected without echoing draft',raw=True)
send([],422,'non-object draft rejected')
send('x'*262145,413,'oversized draft bounded before parsing',raw=True)
connection=HTTPConnection(host.hostname,host.port,timeout=15)
connection.request('POST','/api/v2/onboarding/setup-validation',body=iter([b'x'*131072,b'x'*131072,b'x']),
                   headers={'Origin':origin,'Content-Type':'application/json','Transfer-Encoding':'chunked'},encode_chunked=True)
response=connection.getresponse(); requests+=1
assert response.status==413 and response.headers.get('Cache-Control')=='no-store'
validate('Problem',json.loads(response.read())); connection.close(); cases.append('chunked draft limit returns a complete 413 response')
sections=json.loads((ROOT/'MenuMini_1/src/lib/onboarding/starting-sections.json').read_text())
for path in (ROOT/'templates/business-types').glob('*.json'):
    template=json.loads(path.read_text())
    assert sections[template['id']]==[section['name'] for section in sorted(template['sections'],key=lambda section:section['sortOrder']) if section['isDefaultVisible']]
assert len(sections)==24 and all(isinstance(name,str) for values in sections.values() for name in values)
cases.append('all 24 starting structures contain source section names only, no sample items or prices')
report={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':requests,'cases':cases,
        'scope':'actual local stateless setup HTTP validation; no OTP, accounts, database persistence, billing or publication'}
(ROOT/'docs/setup-draft-http-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
