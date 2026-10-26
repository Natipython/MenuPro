#!/usr/bin/env python3
"""Run maintained payer requests against one disposable local fixture; never upload."""
from pathlib import Path
import json,subprocess,sys,tempfile,uuid
import yaml
ROOT=Path(__file__).resolve().parents[1]
fixture=json.load(sys.stdin)
assert fixture['origin'].startswith('http://127.0.0.1:')
names=['redeemBillGrant','getPayerBill','submitBillClaim','listPayerClaims','leavePayerAccess']
with tempfile.TemporaryDirectory(prefix='menumini-postman-payer-') as scratch:
    dest=Path(scratch);(dest/'.resources').mkdir()
    variables={'baseUrl':fixture['origin']+'/api/v2','origin':fixture['origin'],'diningSession':fixture['guestToken'],'csrfToken':fixture['csrfToken'],'billAccess':''}
    definition={'$kind':'collection','name':'Isolated fictional payer workflow','variables':[{'key':k,'value':v} for k,v in variables.items()]}
    (dest/'.resources/definition.yaml').write_text(yaml.safe_dump(definition,sort_keys=False))
    for path in (ROOT/'postman/collections/menu-workflow-v2').rglob('*.request.yaml'):
        request=yaml.safe_load(path.read_text());name=request['name']
        if name not in names:continue
        request.pop('examples',None);request['description']='Disposable local fixture from maintained request. No real identity or funds.'
        request['order']=(names.index(name)+1)*1000
        for header in request['headers']:
            if header['key']=='Cookie':header['value']=header['value'].replace('__Host-menu_dining=','menu_dining=').replace('__Host-menu_bill_access=','menu_bill_access=')
            if header['key']=='Idempotency-Key':header['value']=str(uuid.uuid4())
        if name=='redeemBillGrant':
            request['body']['content']=json.dumps({'accessToken':fixture['accessToken']})
            request['scripts'][0]['code']+='\nconst c=pm.response.headers.get("Set-Cookie")||"";pm.collectionVariables.set("billAccess",(c.match(/^menu_bill_access=([^;]+)/)||[])[1]||"");\npm.test("Bill cookie is HttpOnly and Strict",()=>{pm.expect(c).to.include("HttpOnly");pm.expect(c).to.include("SameSite=Strict");});'
        if name=='submitBillClaim':
            request['body']['content']=json.dumps(fixture['claimBody'])
            request['scripts'][0]['code']+='\npm.test("Reported transfer remains unverified",()=>pm.expect(pm.response.json().claim.status).to.equal("SUBMITTED"));'
        target=dest/f'{names.index(name)+1:02d}-{name}.request.yaml';target.write_text(yaml.safe_dump(request,sort_keys=False,allow_unicode=True));target.chmod(0o600)
    result=subprocess.run(['npm','exec','--yes','--package=postman-cli@1.73.0','--','postman','collection','run',str(dest),'--no-report-events'],cwd=ROOT,text=True,capture_output=True,timeout=60)
    output=result.stdout+'\n'+result.stderr
    for token in [fixture['guestToken'],fixture['csrfToken'],fixture['accessToken']]:output=output.replace(token,'[REDACTED FICTIONAL CAPABILITY]')
    (ROOT/'docs/payer-postman-validation.txt').write_text(output)
    if result.returncode:raise SystemExit('Local payer Postman run failed. Inspect the local redacted report.')
    print(json.dumps({'requests':5,'passed':True,'report':'docs/payer-postman-validation.txt','workspace_push':False,'report_events':False}))
