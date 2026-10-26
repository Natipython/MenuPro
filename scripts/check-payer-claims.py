#!/usr/bin/env python3
"""Payer capability and transfer-report adapters and PostgreSQL on fictional isolated fixtures only."""
from pathlib import Path
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
PG_BIN=next((p for p in sorted(Path('/usr/lib/postgresql').glob('*/bin'),key=lambda p:int(p.parent.name),reverse=True)
             if (p/'initdb').exists() and int(p.parent.name)>=18),None)
if PG_BIN is None: raise SystemExit('PostgreSQL 18+ required.')
ENV={k:v for k,v in os.environ.items() if not k.startswith('PG') and k not in ('DATABASE_URL','MENU_MERCHANT_DATABASE_URL','MENU_MERCHANT_FIXTURE_CONFIG','MENU_GUEST_DATABASE_URL','MENU_GUEST_FIXTURE_CONFIG','MENU_GUEST_CAPABILITY_KEY')}
def run(args,timeout=60,env=ENV,cwd=None):
    r=subprocess.run([str(a) for a in args],text=True,capture_output=True,env=env,cwd=cwd,timeout=timeout)
    if r.returncode: raise RuntimeError(r.stderr[-6500:] or r.stdout[-6500:])
    return r.stdout.strip()
with tempfile.TemporaryDirectory(prefix='menumini-workspace-') as tmp:
    scratch=Path(tmp);data=scratch/'data';socket=scratch/'socket';socket.mkdir(mode=0o700)
    run([PG_BIN/'initdb','-D',data,'-U','menu_test','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'])
    with (data/'postgresql.conf').open('a') as f:f.write(f"\nlisten_addresses=''\nunix_socket_directories='{socket}'\nport=55481\n")
    started=False
    try:
        run([PG_BIN/'pg_ctl','-D',data,'-l',scratch/'postgres.log','-w','start']);started=True
        psql=[PG_BIN/'psql','-X','-w','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p','55481','-U','menu_test','-d','postgres']
        for path in sorted((ROOT/'MenuMini_1/database/migrations').glob('*.sql')):run(psql+['-f',path])
        run(psql+['-f',ROOT/'MenuMini_1/database/tests/workflow.sql','-f',ROOT/'MenuMini_1/database/tests/mini-two-branches.sql','-f',ROOT/'MenuMini_1/database/tests/catalog.sql'])
        run(psql+['-c','create role menu_workspace_runtime login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_runtime to menu_workspace_runtime; create role menu_guest_runtime login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_guest_api to menu_guest_runtime;'])
        config={'host':str(socket),'port':55481,'user':'menu_workspace_runtime','database':'postgres'}
        output=run(['node','scripts/check-payer-claims.mjs'],timeout=160,cwd=ROOT/'MenuMini_1',env={**ENV,'NODE_ENV':'development','MENU_MERCHANT_FIXTURE_CONFIG':json.dumps(config),'MENU_GUEST_FIXTURE_CONFIG':json.dumps({**config,'user':'menu_guest_runtime'}),'MENU_GUEST_CAPABILITY_KEY':__import__('base64').urlsafe_b64encode(os.urandom(32)).decode().rstrip('=')})
        parsed=json.loads(output[output.index('{"payer_result":'):]);result=parsed['payer_result']
        def query(sql):return run(psql+['-c',sql])
        fixture=parsed['concurrency_fixture']
        def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
        def sql_json(v):return json.dumps(v,ensure_ascii=False).replace("'","''")
        merchant=f"begin;set local role menu_runtime;set local menu.merchant_id='{uid(41)}';set local menu.user_id='{uid(411)}';"
        guest="begin;set local role menu_guest_api;"
        def race(name,first_body,second_body,error,advisory=False):
            procs=[]
            try:
                first=subprocess.Popen(psql+['-c',f"set application_name='{name}_first';"+first_body+'select pg_sleep(2);commit;'],env=ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);procs.append(first)
                def wait(suffix,event):
                    deadline=time.monotonic()+6
                    while time.monotonic()<deadline:
                        if query(f"select exists(select from pg_stat_activity where application_name='{name}_{suffix}' and {event})")=='t':return
                        time.sleep(.03)
                    raise AssertionError('expected concurrency wait not observed')
                wait('first',"wait_event='PgSleep'")
                second=subprocess.Popen(psql+['-c',f"set application_name='{name}_second';"+second_body+'commit;'],env=ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);procs.append(second)
                wait('second',"wait_event_type='Lock'")
                if advisory:assert query(f"select exists(select from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='{name}_second' and l.locktype='advisory' and not l.granted)")=='t'
                _,se=second.communicate(timeout=15);_,fe=first.communicate(timeout=15)
                assert first.returncode==0,fe
                assert second.returncode!=0 and error in se,'expected protected concurrency rejection'
            finally:
                for proc in procs:
                    if proc.poll() is None:proc.kill();proc.communicate(timeout=5)
        revoke=merchant+f"select menumini.payer_staff_command('{fixture['grantId']}','REVOKE','{sql_json({'expectedVersion':fixture['grantVersion']})}','{uid(8801)}');"
        def claim(guest_hash,grant_hash,csrf_hash,key,reference=None):
            body={**fixture['body']}
            if reference:body['providerReference']=reference
            return guest+f"select menumini.payer_entry('{guest_hash}','{grant_hash}','CLAIM','{sql_json(body)}','{uid(key)}','{csrf_hash}');"
        race('payer_revocation',revoke,claim(fixture['guestHash'],fixture['grantHash'],fixture['csrfHash'],8802),'payer grant unavailable')
        result['cases'].append('overlapping staff revocation blocks a waiting payer report after rechecking both capabilities')
        first=claim(fixture['otherGuestHash'],fixture['otherGrantHash'],fixture['otherCsrfHash'],8803)
        second=claim(fixture['otherGuestHash'],fixture['otherGrantHash'],fixture['otherCsrfHash'],8804,'FICTIONAL-SECOND-CONCURRENT')
        race('payer_pending',first,second,'resolve pending payer report first')
        result['cases'].append('overlapping distinct reports from one payer create only one pending claim')
        first=claim(fixture['dupGuestHash'],fixture['dupGrantHash'],fixture['dupCsrfHash'],8805,'FICTIONAL-CROSS-BRANCH')
        second=claim(fixture['branchGuestHash'],fixture['branchGrantHash'],fixture['branchCsrfHash'],8806,'fictional-cross-branch').replace(fixture['body']['destinationFingerprint'],fixture['branchFingerprint'])
        race('payer_cross_branch',first,second,'transfer reference already reported or received',advisory=True)
        result['cases'].append('two different branches and payers sharing a destination serialize on its reference and cannot report the same transfer with different case')
        persisted="select jsonb_build_object('grants',(select jsonb_agg(to_jsonb(t) order by id) from menumini.bill_access_grants t),'claims',(select jsonb_agg(to_jsonb(c) order by id) from menumini.bill_payment_claims c),'guests',(select jsonb_agg(to_jsonb(g) order by guest_session_id) from menumini.visit_guests g),'orders',(select jsonb_agg(to_jsonb(o) order by id) from menumini.orders o),'results',(select jsonb_agg(to_jsonb(r) order by request_key) from menumini.service_command_results r))"
        before=query(persisted);run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log']);assert query(persisted)==before
        result['cases'].append('restart preserves grant revocations, claims, destination snapshots and original command responses')
        assert query(guest+f"select menumini.payer_entry('{fixture['restartGuestHash']}','{fixture['restartGrantHash']}','DETAIL')->'bill'->>'outstandingAmount';commit;").splitlines()[0]=='120.00'
        result['cases'].append('payer capability resolution and exact outstanding balance survive PostgreSQL restart')
        result['passed']=len(result['cases']);result.update(verified_at=datetime.now(timezone.utc).isoformat(),failed=0,migrations=len(list((ROOT/'MenuMini_1/database/migrations').glob('*.sql'))),restart_verified=True,concurrent_connection_cases=3,
          scope='actual payer adapters and PostgreSQL with fictional capabilities, five direct local HTTP requests plus five maintained Postman requests, three overlapping cases and restart; no live merchant OTP, bank transfer or physical-device acceptance')
        (ROOT/'docs/payer-claims-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    finally:
        if started:run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
