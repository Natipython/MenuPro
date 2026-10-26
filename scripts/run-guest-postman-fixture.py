#!/usr/bin/env python3
"""Run maintained guest requests against one disposable local fixture; never upload."""
from pathlib import Path
import json,os,secrets,subprocess,sys,tempfile,uuid
import yaml
ROOT=Path(__file__).resolve().parents[1]
fixture=json.load(sys.stdin)
assert fixture['origin'].startswith('http://127.0.0.1:')
names=['createDiningSession','pairGuestVisit','getGuestContext','getGuestOffer','submitGuestOrder','listGuestOrders','getGuestOrder','revokeGuestSession']
nonce=secrets.token_urlsafe(32)
with tempfile.TemporaryDirectory(prefix='menumini-postman-guest-') as scratch:
    dest=Path(scratch);(dest/'.resources').mkdir()
    variables={'baseUrl':fixture['origin']+'/api/v2','origin':fixture['origin'],'visitId':fixture['visitId'],'diningSession':'','csrfToken':'','orderId':''}
    definition={'$kind':'collection','name':'Isolated fictional guest workflow','variables':[{'key':k,'value':v} for k,v in variables.items()]}
    (dest/'.resources/definition.yaml').write_text(yaml.safe_dump(definition,sort_keys=False))
    for path in (ROOT/'postman/collections/menu-workflow-v2').rglob('*.request.yaml'):
        request=yaml.safe_load(path.read_text());name=request['name']
        if name not in names:continue
        request.pop('examples',None);request['description']='Disposable local fixture from maintained request. No real identity or funds.'
        request['order']=(names.index(name)+1)*1000
        for header in request['headers']:
            if header['key']=='Cookie':header['value']=header['value'].replace('__Host-menu_dining=','menu_dining=')
            if header['key']=='Idempotency-Key':header['value']=str(uuid.uuid4())
        if name=='createDiningSession':
            request['body']['content']=json.dumps({'tableToken':fixture['tableToken'],'sessionNonce':nonce})
            request['scripts'][0]['code']+='\nconst c=pm.response.headers.get("Set-Cookie")||""; pm.collectionVariables.set("diningSession",(c.match(/^menu_dining=([^;]+)/)||[])[1]||""); pm.collectionVariables.set("csrfToken",pm.response.json().csrfToken);\npm.test("Anonymous cookie is HttpOnly and Strict",()=>{pm.expect(c).to.include("HttpOnly");pm.expect(c).to.include("SameSite=Strict");});'
        if name=='pairGuestVisit':request['body']['content']=json.dumps({'pairingToken':fixture['invitation']})
        if name=='submitGuestOrder':
            request['body']['content']=json.dumps(fixture['orderBody'])
            request['scripts'][0]['code']+='\npm.collectionVariables.set("orderId",pm.response.json().id);\npm.test("Guest order awaits acceptance and has no staff controls",()=>{const b=pm.response.json();pm.expect(b.status).to.equal("SUBMITTED");pm.expect(b).not.to.have.property("allowedTransitions");});'
        target=dest/f'{names.index(name)+1:02d}-{name}.request.yaml';target.write_text(yaml.safe_dump(request,sort_keys=False,allow_unicode=True));target.chmod(0o600)
    result=subprocess.run(['npm','exec','--yes','--package=postman-cli@1.73.0','--','postman','collection','run',str(dest),'--no-report-events'],cwd=ROOT,text=True,capture_output=True,timeout=60)
    output=result.stdout+'\n'+result.stderr
    for token in [fixture['tableToken'],fixture['invitation'],nonce]:output=output.replace(token,'[REDACTED FICTIONAL CAPABILITY]')
    (ROOT/'docs/guest-postman-validation.txt').write_text(output)
    if result.returncode:raise SystemExit('Local guest Postman run failed. Inspect the local redacted report.')
    print(json.dumps({'requests':8,'passed':True,'report':'docs/guest-postman-validation.txt','workspace_push':False,'report_events':False}))
