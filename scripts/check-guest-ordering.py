#!/usr/bin/env python3
"""Guest capability HTTP adapters and PostgreSQL on fictional isolated fixtures only."""
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
    with (data/'postgresql.conf').open('a') as f:f.write(f"\nlisten_addresses=''\nunix_socket_directories='{socket}'\nport=55480\n")
    started=False
    try:
        run([PG_BIN/'pg_ctl','-D',data,'-l',scratch/'postgres.log','-w','start']);started=True
        psql=[PG_BIN/'psql','-X','-w','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p','55480','-U','menu_test','-d','postgres']
        for path in sorted((ROOT/'MenuMini_1/database/migrations').glob('*.sql')):run(psql+['-f',path])
        run(psql+['-f',ROOT/'MenuMini_1/database/tests/workflow.sql','-f',ROOT/'MenuMini_1/database/tests/mini-two-branches.sql','-f',ROOT/'MenuMini_1/database/tests/catalog.sql'])
        run(psql+['-c','create role menu_workspace_runtime login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_runtime to menu_workspace_runtime; create role menu_guest_runtime login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_guest_api to menu_guest_runtime;'])
        config={'host':str(socket),'port':55480,'user':'menu_workspace_runtime','database':'postgres'}
        output=run(['node','scripts/check-guest-ordering.mjs'],timeout=160,cwd=ROOT/'MenuMini_1',env={**ENV,'NODE_ENV':'development','MENU_MERCHANT_FIXTURE_CONFIG':json.dumps(config),'MENU_GUEST_FIXTURE_CONFIG':json.dumps({**config,'user':'menu_guest_runtime'}),'MENU_GUEST_CAPABILITY_KEY':__import__('base64').urlsafe_b64encode(os.urandom(32)).decode().rstrip('=')})
        parsed=json.loads(output[output.index('{"guest_result":'):]);result=parsed['guest_result']
        def query(sql):return run(psql+['-c',sql])
        fixture=parsed['concurrency_fixture']
        def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
        def sql_json(v):return json.dumps(v,ensure_ascii=False).replace("'","''")
        merchant=f"begin;set local role menu_runtime;set local menu.merchant_id='{uid(41)}';set local menu.user_id='{uid(411)}';"
        guest="begin;set local role menu_guest_api;"
        def race(name,first_body,second_body,error):
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
                _,se=second.communicate(timeout=15);_,fe=first.communicate(timeout=15)
                assert first.returncode==0,fe
                assert second.returncode!=0 and error in se,'expected protected concurrency rejection'
            finally:
                for proc in procs:
                    if proc.poll() is None:proc.kill();proc.communicate(timeout=5)
        rotate=merchant+f"select menumini.issue_guest_capability('{fixture['visit']}','VISIT_INVITATION',{fixture['visitVersion']},'"+'a'*64+f"','{uid(8601)}');"
        pair=guest+f"select menumini.guest_entry('{fixture['pairHash']}','PAIR','{fixture['visit']}','{sql_json({'pairingToken':fixture['invitation']})}','{uid(8602)}','{fixture['pairCsrf']}');"
        race('guest_rotation',rotate,pair,'valid own session and private visit pairing required')
        result['cases'].append('overlapping invitation rotation prevents joining with the superseded token')
        revoke=guest+f"select menumini.guest_entry('{fixture['orderHash']}','REVOKE',null,'{{}}','{uid(8603)}','{fixture['orderCsrf']}');"
        submit=guest+f"select menumini.guest_entry('{fixture['orderHash']}','SUBMIT',null,'{sql_json(fixture['orderBody'])}','{uid(8604)}','{fixture['orderCsrf']}');"
        race('guest_revocation',revoke,submit,'guest session unavailable')
        result['cases'].append('overlapping revocation prevents a waiting order from using a revoked cookie')
        query(f"insert into menumini.guest_request_limits values('{fixture['table']}','TABLE_SESSION',date_trunc('hour',clock_timestamp()),119) on conflict(scope_id,kind,bucket) do update set count=119")
        def starting(hash_letter,key):return guest+f"select menumini.start_guest_session('{fixture['tableHash']}','"+hash_letter*64+"','"+'d'*64+f"','{uid(key)}');"
        race('guest_session_guard',starting('e',8605),starting('f',8606),'guest request rate exceeded')
        result['cases'].append('overlapping public session starts enforce the durable per-table hourly guard')
        persisted="select jsonb_build_object('sessions',(select jsonb_agg(to_jsonb(t) order by id) from menumini.dining_sessions t),'guests',(select jsonb_agg(to_jsonb(g) order by guest_session_id) from menumini.visit_guests g),'orders',(select jsonb_agg(to_jsonb(o) order by id) from menumini.orders o),'results',(select jsonb_agg(to_jsonb(r) order by request_key) from menumini.service_command_results r))"
        before=query(persisted);run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log']);assert query(persisted)==before
        result['cases'].append('restart preserves hashed sessions, association, durable orders and original command responses')
        assert query(guest+f"select menumini.guest_entry('{parsed['restart_cookie_hash']}','CONTEXT')->'association'->>'visitStatus';commit;").splitlines()[0]=='ENDED'
        result['cases'].append('capability resolution still returns own ended visit after PostgreSQL restart')
        result['passed']=len(result['cases']);result.update(verified_at=datetime.now(timezone.utc).isoformat(),failed=0,migrations=len(list((ROOT/'MenuMini_1/database/migrations').glob('*.sql'))),restart_verified=True,concurrent_connection_cases=3,http_requests=parsed['network_http_requests'],postman=parsed['postman'],
          scope='actual guest request/cookie adapters and limited PostgreSQL entry with fictional capabilities; twelve direct real local HTTP requests plus eight maintained Postman requests, three overlapping database cases and restart; no live merchant OTP, external service or physical device acceptance')
        (ROOT/'docs/guest-ordering-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    finally:
        if started:run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
