#!/usr/bin/env python3
"""Actual HTTP rejection boundaries against an unconfigured loopback preview."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,http.client,json,uuid
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--origin',default='http://127.0.0.1:5196');args=p.parse_args();origin=urlparse(args.origin)
assert origin.scheme=='http' and origin.hostname in ('127.0.0.1','localhost')
uid=lambda n:f'00000000-0000-4000-8000-{n:012d}'
headers={'Origin':args.origin,'Content-Type':'application/json','Cookie':'menu_staff_session=FICTIONAL_SPOOF','X-User-ID':uid(411),'X-Business-ID':uid(41),'X-Guest-Session-Id':uid(301),'X-CSRF-Token':'F'*43,'Idempotency-Key':str(uuid.uuid4())}
cases=[];requests=0
def call(method,path,body=None,cookie=None):
 global requests
 conn=http.client.HTTPConnection(origin.hostname,origin.port,timeout=20)
 try:
  conn.request(method,'/api/v2'+path,body=json.dumps(body) if body is not None else None,headers={**headers,**({'Cookie':cookie} if cookie else {})});r=conn.getresponse();data=json.loads(r.read());requests+=1
  assert r.getheader('Cache-Control')=='no-store' and r.getheader('Referrer-Policy')=='no-referrer'
  return r.status,data,r.getheader('Set-Cookie')
 finally:conn.close()
for method,path,body in [('GET','/merchant/bills/'+uid(801)+'/payers',None),('POST','/merchant/bills/'+uid(801)+'/access-grants',{'guestSessionId':uid(301),'expectedBillVersion':1}),('POST','/merchant/bill-access-grants/'+uid(899)+'/revocation',{'expectedVersion':1})]:
 status,data,cookie=call(method,path,body);assert status==401 and data['code']=='AUTHENTICATION_REQUIRED' and cookie is None
 cases.append(method+' '+path+' rejects forged merchant identity before selecting, granting or revoking access')
for method,path,body in [('POST','/payer/access',{'accessToken':'B'*43}),('GET','/payer/bill',None),('POST','/payer/bill/payment-claims',{}),('GET','/payer/bill/payment-claims',None),('POST','/payer/access/revocation',{})]:
 status,data,cookie=call(method,path,body);assert status==401 and data['code']=='GUEST_SESSION_REQUIRED' and cookie is None
 cases.append(method+' '+path+' cannot use UUID/header assertions in place of a dining capability')
status,data,cookie=call('GET','/payer/bill',cookie='menu_dining='+'G'*43);assert status==403 and data['code']=='PAYER_ACCESS_REQUIRED' and cookie is None
cases.append('a dining cookie alone cannot request shared bill data')
status,data,cookie=call('GET','/payer/bill',cookie='menu_dining='+'G'*43+'; menu_bill_access='+'B'*43);assert status==503 and cookie is None
cases.append('unconfigured preview cannot resolve invented capabilities or use an ambient database')
result={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':requests,'cases':cases,'scope':'actual local HTTP without guest/merchant configuration; closed merchant authorization and payer capability boundaries. Successful payer HTTP is tested in a separate isolated configured fixture.'}
(ROOT/'docs/payer-http-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
