#!/usr/bin/env python3
"""Verify actual public HTTP remains closed for staff service until real identity."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,http.client,json
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--origin',default='http://127.0.0.1:5196');args=p.parse_args();origin=urlparse(args.origin)
assert origin.scheme=='http' and origin.hostname in ('localhost','127.0.0.1')
uid=lambda n:f'00000000-0000-4000-8000-{n:012d}'
branch='/api/v2/merchant/branches/'+uid(101);visit='/api/v2/merchant/visits/'+uid(501);order='/api/v2/merchant/orders/'+uid(701)
routes=[('GET',branch+'/tables'),('POST',branch+'/tables'),('PUT',branch+'/tables/'+uid(201)),('POST',branch+'/staff-visits'),
 ('GET',visit),('POST',visit+'/ending'),('GET',branch+'/service-menu'),('GET',branch+'/orders'),('POST',branch+'/orders'),('GET',order),
 ('POST',order+'/transitions'),('GET','/api/v2/merchant/bills/'+uid(801))]
cases=[];requests=0
def call(method,path):
 global requests
 conn=http.client.HTTPConnection(origin.hostname,origin.port,timeout=20)
 try:
  conn.request(method,path,body='{}' if method!='GET' else None,headers={'Origin':args.origin,'Content-Type':'application/json',
    'Cookie':'menu_staff_session=FICTIONAL_SPOOF','X-User-ID':uid(411),'X-Business-ID':uid(41),'X-CSRF-Token':'FICTIONAL_SPOOF','Idempotency-Key':uid(900)})
  r=conn.getresponse();data=r.read();requests+=1
  assert r.getheader('Cache-Control')=='no-store' and r.getheader('Set-Cookie') is None
  return r.status,data
 finally:conn.close()
for method,path in routes:
 status,body=call(method,path);value=json.loads(body);assert status==401 and value['code']=='AUTHENTICATION_REQUIRED'
 assert not any(k in value for k in ('items','visit','bill','tables','session','pairingToken'))
 cases.append(method+' '+path+' rejects spoofed client identity without disclosing business data')
for path in ['/service/'+uid(101),'/preparation/'+uid(101)]:
 status,body=call('GET',path);assert status==200 and b'Verified' in body and b'required' in body
 assert b'Open seating' not in body and b'Accept unpaid order' not in body;cases.append(path+' serves locked access view')
status,body=call('GET','/service/rehearsal');assert status==200 and b'Practice only' in body and b'fictional business' in body
cases.append('public rehearsal is explicitly fictional, creates no session and is not an operating business surface')
result={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'http_requests':requests,'cases':cases,
 'scope':'actual local HTTP closed access and rehearsal/page headers only; successful staff actions verified separately in-process, not through authentication'}
(ROOT/'docs/staff-service-http-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
