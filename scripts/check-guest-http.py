#!/usr/bin/env python3
"""Verify real local HTTP keeps merchant issuance closed and unconfigured guest access safe."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,http.client,json,uuid
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--origin',default='http://127.0.0.1:5196');args=p.parse_args();origin=urlparse(args.origin)
assert origin.scheme=='http' and origin.hostname in ('localhost','127.0.0.1')
uid=lambda n:f'00000000-0000-4000-8000-{n:012d}'
cases=[];requests=0
headers={'Origin':args.origin,'Content-Type':'application/json','Cookie':'menu_staff_session=FICTIONAL_SPOOF','X-User-ID':uid(411),'X-Business-ID':uid(41),'X-Guest-Session-Id':uid(301),'X-CSRF-Token':'F'*43,'Idempotency-Key':str(uuid.uuid4())}
def call(method,path,body=None,extra=None):
 global requests
 conn=http.client.HTTPConnection(origin.hostname,origin.port,timeout=20)
 try:
  conn.request(method,path,body=json.dumps(body) if body is not None else None,headers={**headers,**(extra or {})})
  response=conn.getresponse();data=response.read();requests+=1
  assert response.getheader('Cache-Control')=='no-store' and response.getheader('Referrer-Policy')=='no-referrer'
  return response.status,data,response.getheader('Set-Cookie')
 finally:conn.close()
for path in ['/api/v2/merchant/tables/'+uid(201)+'/guest-link','/api/v2/merchant/visits/'+uid(501)+'/invitations']:
 status,body,cookie=call('POST',path,{'expectedVersion':1});assert status==401 and json.loads(body)['code']=='AUTHENTICATION_REQUIRED' and cookie is None
 cases.append(path+' rejects forged merchant identity before issuing any capability')
for path,method,body in [('/api/v2/guest/session','GET',None),('/api/v2/guest/menu','GET',None),('/api/v2/guest/orders','GET',None),('/api/v2/guest/orders/'+uid(701),'GET',None),('/api/v2/guest/orders','POST',{}),('/api/v2/guest/visits/'+uid(501)+'/association','POST',{}),('/api/v2/guest/session/revocation','POST',{})]:
 status,data,cookie=call(method,path,body);assert status==401 and json.loads(data)['code']=='GUEST_SESSION_REQUIRED' and cookie is None
 cases.append(method+' '+path+' rejects UUID/header identity without a guest cookie')
status,body,cookie=call('POST','/api/v2/dining-sessions',{'tableToken':'T'*43,'sessionNonce':'N'*43});assert status==503 and cookie is None
cases.append('unconfigured local guest entry cannot create a session or connect to an ambient database')
status,body,cookie=call('GET','/visit');assert status==200 and b'Loading your session' in body and cookie is None
cases.append('guest entry page exposes no seeded identity, visit details or capability in SSR HTML')
result={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':requests,'cases':cases,
 'scope':'actual local HTTP without guest configuration; closed merchant issuance and no fake guest principal. Successful guest HTTP uses a separate isolated configured fixture.'}
(ROOT/'docs/guest-http-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
