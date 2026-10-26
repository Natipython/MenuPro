#!/usr/bin/env python3
"""Interrupted command recovery, encrypted browser core and request adapters and PostgreSQL on fictional isolated fixtures only."""
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
        output=run(['node','scripts/check-command-recovery.mjs'],timeout=160,cwd=ROOT/'MenuMini_1',env={**ENV,'NODE_ENV':'development','MENU_MERCHANT_FIXTURE_CONFIG':json.dumps(config),'MENU_GUEST_FIXTURE_CONFIG':json.dumps({**config,'user':'menu_guest_runtime'}),'MENU_GUEST_CAPABILITY_KEY':__import__('base64').urlsafe_b64encode(os.urandom(32)).decode().rstrip('=')})
        parsed=json.loads(output[output.index('{"recovery_result":'):]);result=parsed['recovery_result']
        def query(sql):return run(psql+['-c',sql])
        fixture=parsed['concurrency_fixture']
        uid=lambda n:f'00000000-0000-4000-8000-{n:012d}'
        def sql_json(v):return json.dumps(v,ensure_ascii=False).replace("'","''")
        staff=f"begin;set local role menu_runtime;set local menu.merchant_id='{uid(41)}';set local menu.user_id='{uid(411)}';"
        guest="begin;set local role menu_guest_api;"
        def guest_command(key):return guest+f"select menumini.guest_entry('{fixture['guestHash']}','SUBMIT',null,'{sql_json(fixture['orderBody'])}','{uid(key)}','{fixture['csrfHash']}');"
        def guest_cancel(key):return guest+f"select menumini.guest_command_recovery('{fixture['guestHash']}',null,'GUEST','{fixture['visit']}','{uid(key)}',true,'{fixture['csrfHash']}');"
        def race(name,first_body,second_body,error=None,state=None):
            procs=[]
            try:
                first=subprocess.Popen(psql+['-c',f"set application_name='{name}_first';"+first_body+'select pg_sleep(2);commit;'],env=ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);procs.append(first)
                def wait(suffix,condition):
                    deadline=time.monotonic()+8
                    while time.monotonic()<deadline:
                        if query(f"select exists(select from pg_stat_activity where application_name='{name}_{suffix}' and {condition})")=='t':return
                        time.sleep(.03)
                    raise AssertionError('expected concurrency wait was not observed')
                wait('first',"wait_event='PgSleep'")
                second=subprocess.Popen(psql+['-c',f"set application_name='{name}_second';"+second_body+'commit;'],env=ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);procs.append(second)
                wait('second',"wait_event_type='Lock'")
                so,se=second.communicate(timeout=15);_,fe=first.communicate(timeout=15)
                assert first.returncode==0,fe
                if error:assert second.returncode!=0 and error in se,'expected original command rejection'
                else:assert second.returncode==0 and any(json.loads(line).get('state')==state for line in so.splitlines() if line.startswith('{')),se
            finally:
                for proc in procs:
                    if proc.poll() is None:proc.kill();proc.communicate(timeout=5)
        race('recovery_cancel_wins',guest_cancel(8891),guest_command(8891),'original command cancelled')
        result['cases'].append('overlapping cancellation wins branch lock and prevents a waiting guest order from recording')
        race('recovery_original_wins',guest_command(8892),guest_cancel(8892),state='COMMITTED')
        result['cases'].append('overlapping original order wins first and cancellation returns its committed result without reversing it')
        cancel=staff+f"select menumini.staff_command_recovery('{fixture['venue']}','CASHIER','RECORD_RECEIPT','{fixture['bill']}','{uid(8893)}',true);"
        original=staff+f"select menumini.cashier_command('{fixture['bill']}','RECORD_RECEIPT','{sql_json(fixture['receiptBody'])}','{uid(8893)}');"
        race('recovery_cash_cancel',cancel,original,'original command cancelled')
        result['cases'].append('overlapping cancellation prevents delayed cashier receipt from creating duplicate received funds')
        cancel=guest+f"select menumini.guest_command_recovery('{fixture['guestHash']}','{fixture['grantHash']}','PAYER','{fixture['bill']}','{uid(8894)}',true,'{fixture['csrfHash']}');"
        original=guest+f"select menumini.payer_entry('{fixture['guestHash']}','{fixture['grantHash']}','CLAIM','{sql_json(fixture['claimBody'])}','{uid(8894)}','{fixture['csrfHash']}');"
        race('recovery_claim_cancel',cancel,original,'original command cancelled')
        result['cases'].append('overlapping cancellation prevents delayed payer report while preserving earlier financial evidence')
        denied=subprocess.run([str(x) for x in psql+['-c','begin;set local role menu_guest_api;select * from menumini.command_cancellations;commit;']],text=True,capture_output=True,env=ENV);assert denied.returncode and 'permission denied' in denied.stderr
        result['cases'].append('limited guest role cannot directly read cancellation or other actors history')
        persisted="select jsonb_build_object('cancellations',(select jsonb_agg(to_jsonb(c) order by request_key) from menumini.command_cancellations c),'results',(select jsonb_agg(to_jsonb(r) order by request_key,operation) from menumini.service_command_results r),'orders',(select jsonb_agg(to_jsonb(o) order by id) from menumini.orders o),'receipts',(select jsonb_agg(to_jsonb(r) order by id) from menumini.recorded_receipts r))"
        before=query(persisted);run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log']);assert query(persisted)==before
        result['cases'].append('PostgreSQL restart preserves immutable cancellations, original results, orders and receipts')
        assert query(guest+f"select menumini.guest_command_recovery('{fixture['guestHash']}',null,'GUEST','{fixture['visit']}','{fixture['orderKey']}')->>'state';commit;").splitlines()[0]=='COMMITTED'
        assert query(guest+f"select menumini.guest_command_recovery('{fixture['guestHash']}',null,'GUEST','{fixture['visit']}','{uid(8891)}')->>'state';commit;").splitlines()[0]=='CANCELLED'
        result['cases'].append('committed and cancelled status resolution works after database restart')
        result.update(passed=len(result['cases']),failed=0,verified_at=datetime.now(timezone.utc).isoformat(),migrations=11,restart_verified=True,concurrent_connection_cases=4,
         scope='actual recovery adapters, cookie HTTP, maintained Postman, real PostgreSQL races/restart and browser core with explicit memory storage double; actual IndexedDB reload evidence is recorded separately. No merchant auth bypass, live funds or device acceptance')
        (ROOT/'docs/command-recovery-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    finally:
        if started:run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
