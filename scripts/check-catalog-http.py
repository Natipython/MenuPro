#!/usr/bin/env python3
"""Verify real customer HTTP reads and closed identity gates against a known fixture."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from copy import deepcopy
import argparse, json, os, subprocess, yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(); parser.add_argument('--fixture-dir',required=True); parser.add_argument('--mapped-catalog'); args=parser.parse_args()
fixture=Path(args.fixture_dir).resolve()
assert fixture.parent==Path('/tmp') and fixture.name.startswith('menumini-public-')
config=json.loads((fixture/'fixture.json').read_text()); assert config['marker']=='menumini-fictional-public-preview'
assert Path(config['socket']).resolve()==fixture/'socket' and Path(config['data']).resolve()==fixture/'data'
origin=config['http_origin']; assert origin.startswith('http://127.0.0.1:')
PG_BIN=next(p for p in sorted(Path('/usr/lib/postgresql').glob('*/bin'),key=lambda p:int(p.parent.name),reverse=True) if (p/'psql').exists())
ENV={k:v for k,v in os.environ.items() if not k.startswith('PG') and k!='DATABASE_URL'}
psql=[str(PG_BIN/'psql'),'-X','-w','-q','-At','-v','ON_ERROR_STOP=1','-h',config['socket'],'-p',str(config['port']),'-U','menu_test','-d','postgres']
def sql(statement):
    result=subprocess.run(psql+['-c',statement],env=ENV,text=True,capture_output=True,timeout=15)
    assert result.returncode==0,result.stderr[-1800:]
    return result.stdout.strip()
spec=yaml.safe_load((ROOT/'postman/specs/workflow-v2.openapi.yaml').read_text())
base={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:menumini:catalog-http','components':spec['components']}
registry=Registry().with_resource(base['$id'],Resource.from_contents(base))
def validate(name,value):
    Draft202012Validator({'$ref':base['$id']+'#/components/schemas/'+name},registry=registry,format_checker=FormatChecker()).validate(value)
cases=[]; request_count=0
def request(path,status,label,*,method='GET',body=None,extra=None,html=False):
    global request_count
    headers={'Origin':origin,'Accept':'application/json'}
    if body is not None: headers['Content-Type']='application/json'
    headers.update(extra or {})
    data=json.dumps(body).encode() if body is not None else None
    req=Request(origin+path,method=method,data=data,headers=headers)
    try: response=urlopen(req,timeout=15)
    except HTTPError as error: response=error
    request_count+=1
    assert response.status==status,(label,response.status)
    assert response.headers.get('Cache-Control')=='no-store',label
    assert response.headers.get('Referrer-Policy')=='no-referrer',label
    assert not response.headers.get('Set-Cookie'),label
    raw=response.read().decode()
    assert 'Private Owner' not in raw and 'Private Legal' not in raw and '@example.test' not in raw,label
    result=raw if html else json.loads(raw)
    if not html: validate('PublicMenu' if status==200 else 'Problem',result)
    cases.append(label); return result
path='/api/v2/public/venues/fictional-published-cafe/menu'
first=request(path,200,'public HTTP returns the committed PostgreSQL menu without private data')
assert first['content']['sections'][0]['items'][0]['basePrice']=='70.00'
assert not first['content']['sections'][0]['items'][0]['availableNow']
request('/api/v2/public/venues/fictional-unpublished-cafe/menu',404,'unpublished branch cannot expose its draft')
request('/api/v2/public/venues/not-a-menu/menu',404,'unknown public menu returns a safe structured error')
request('/api/v2/public/venues/invalid%27slug/menu',404,'untrusted slug cannot become SQL')
assert request(path+'?merchantId=00000000-0000-4000-8000-000000000042',200,'query tenant assertion cannot change public projection')==first
venue=config['venue_id']; branch='/api/v2/merchant/branches/'+venue
spoof={'X-User-Id':'00000000-0000-4000-8000-000000000411','X-Merchant-Id':'00000000-0000-4000-8000-000000000041',
       'X-CSRF-Token':'fictional-not-a-session','Cookie':'menu_staff_session=fictional-not-a-session'}
for suffix,method in [('/menu-draft','GET'),('/menu-draft','PUT'),('/profile-draft','GET'),('/profile-draft','PUT'),('/menu-publications','POST')]:
    response=request(branch+suffix,401,'identity remains required for '+method+' '+suffix,method=method,
                     body={} if method!='GET' else None,extra=spoof)
    assert response['code']=='AUTHENTICATION_REQUIRED'
assert request(path,200,'spoofed editing requests leave the public menu unchanged')==first
page=request('/menu/fictional-published-cafe',200,'customer HTML is served from the committed menu with no-store headers',html=True)
assert 'Fictional New Name' in page and 'data:image/png;base64,' in page
assert origin+'/menu/fictional-published-cafe' in page and 'Currently unavailable' in page
cases.append('customer HTML contains its branch-specific menu link, local QR image and sold-out label')
before_count=sql(f"select count(*) from menumini.menu_publications where venue_id='{venue}'")
content=json.loads(sql(f"select content from menumini.menu_drafts where venue_id='{venue}'")); content['sections'][0]['items'][0]['basePrice']='77.77'
payload=json.dumps(content,ensure_ascii=False).replace("'","''")
context="begin; set local role menu_runtime; set local menu.merchant_id='00000000-0000-4000-8000-000000000041'; set local menu.user_id='00000000-0000-4000-8000-000000000411'; "
sql(context+f"select menumini.save_menu_draft('{venue}',2,'{payload}'::jsonb,'00000000-0000-4000-8000-000000008001'); commit;")
assert request(path,200,'a saved draft price stays absent from customer HTTP')==first
sql(context+f"select menumini.publish_menu('{venue}',3,2,'00000000-0000-4000-8000-000000008002'); commit;")
second=request(path,200,'trusted fixture publication appears through a fresh customer HTTP request')
assert second['revision']==3 and second['content']['sections'][0]['items'][0]['basePrice']=='77.77'
assert not second['content']['sections'][0]['items'][0]['availableNow']
assert sql(f"select count(*) from menumini.menu_publications where venue_id='{venue}'")==str(int(before_count)+1)
restart=subprocess.run([str(PG_BIN/'pg_ctl'),'-D',config['data'],'-m','fast','-w','restart','-l',str(fixture/'postgres.log')],env=ENV,capture_output=True,text=True,timeout=30)
assert restart.returncode==0,restart.stderr[-1000:]
assert request(path,200,'PostgreSQL restart preserves the customer publication and reader reconnects')==second
request('/api/v2/public/venues/fictional-cafe/menu',404,'legacy unvalidated fixture is not automatically exposed through HTTP')
if args.mapped_catalog:
    mapped=json.loads(Path(args.mapped_catalog).read_text())
    assert set(mapped)=={'profile','menu'} and mapped['profile']['branch']['publicName'].startswith('Fictional')
    validate('BranchProfileInput',mapped['profile']); validate('MenuDraftInput',mapped['menu'])
    profile_payload=json.dumps(mapped['profile'],ensure_ascii=False).replace("'","''")
    menu_payload=json.dumps(mapped['menu'],ensure_ascii=False).replace("'","''")
    sql(context+f"select menumini.save_branch_profile('{venue}',2,'{profile_payload}'::jsonb,'00000000-0000-4000-8000-000000008003'); "
        +f"select menumini.save_menu_draft('{venue}',3,'{menu_payload}'::jsonb,'00000000-0000-4000-8000-000000008004'); commit;")
    assert request(path,200,'mapped preparation stays private until explicit publication')==second
    sql(context+f"select menumini.publish_menu('{venue}',4,3,'00000000-0000-4000-8000-000000008005'); commit;")
    mapped_public=request(path,200,'onboarding-format fixture survives conversion, persistence and customer HTTP publication')
    assert mapped_public['content']['sections'][0]['items'][0]['basePrice']=='60.50'
    assert mapped_public['content']['sections'][0]['items'][0]['nameAm']=='ሙከራ ቡና'
    assert sql("select plan from menumini.merchants where id='00000000-0000-4000-8000-000000000041'")=='FREE'
    assert sql(f"select ordering_enabled from menumini.venues where id='{venue}'")=='f'
    cases.append('a Mini preparation preference never upgrades the fixture business or activates ordering')
report={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':request_count,'cases':cases,
        'scope':'real local PostgreSQL-to-HTTP customer flow and closed identity gates; fixture publications use trusted SQL contexts, not browser/auth bypass; no real device or production release'}
(ROOT/'docs/catalog-http-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
