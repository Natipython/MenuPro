#!/usr/bin/env python3
"""Staff-service adapters, real concurrency and restart on fictional PG only."""
from pathlib import Path
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
PG_BIN=next((p for p in sorted(Path('/usr/lib/postgresql').glob('*/bin'),key=lambda p:int(p.parent.name),reverse=True)
             if (p/'initdb').exists() and int(p.parent.name)>=18),None)
if PG_BIN is None: raise SystemExit('PostgreSQL 18+ required.')
ENV={k:v for k,v in os.environ.items() if not k.startswith('PG') and k not in ('DATABASE_URL','MENU_MERCHANT_DATABASE_URL','MENU_MERCHANT_FIXTURE_CONFIG')}
def run(args,timeout=60,env=ENV,cwd=None):
    r=subprocess.run([str(a) for a in args],text=True,capture_output=True,env=env,cwd=cwd,timeout=timeout)
    if r.returncode: raise RuntimeError(r.stderr[-6500:] or r.stdout[-6500:])
    return r.stdout.strip()
with tempfile.TemporaryDirectory(prefix='menumini-workspace-') as tmp:
    scratch=Path(tmp);data=scratch/'data';socket=scratch/'socket';socket.mkdir(mode=0o700)
    run([PG_BIN/'initdb','-D',data,'-U','menu_test','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'])
    with (data/'postgresql.conf').open('a') as f:f.write(f"\nlisten_addresses=''\nunix_socket_directories='{socket}'\nport=55479\n")
    started=False
    try:
        run([PG_BIN/'pg_ctl','-D',data,'-l',scratch/'postgres.log','-w','start']);started=True
        psql=[PG_BIN/'psql','-X','-w','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p','55479','-U','menu_test','-d','postgres']
        for path in sorted((ROOT/'MenuMini_1/database/migrations').glob('*.sql')):run(psql+['-f',path])
        run(psql+['-f',ROOT/'MenuMini_1/database/tests/workflow.sql','-f',ROOT/'MenuMini_1/database/tests/mini-two-branches.sql','-f',ROOT/'MenuMini_1/database/tests/catalog.sql'])
        run(psql+['-c','create role menu_workspace_runtime login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_runtime to menu_workspace_runtime;'])
        config={'host':str(socket),'port':55479,'user':'menu_workspace_runtime','database':'postgres'}
        output=run(['node','scripts/check-staff-service.mjs'],timeout=100,cwd=ROOT/'MenuMini_1',env={**ENV,'NODE_ENV':'development','MENU_MERCHANT_FIXTURE_CONFIG':json.dumps(config)})
        result=json.loads(output[output.index('{"staff_service_result":'):])['staff_service_result']
        def query(sql):return run(psql+['-c',sql])
        def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
        venue=query("select id from menumini.venues where public_slug='fictional-published-cafe'")
        ctx=f"begin;set local role menu_runtime;set local menu.merchant_id='{uid(41)}';set local menu.user_id='{uid(411)}';"
        def race(name,first_body,second_body,error):
            procs=[]
            try:
                first=subprocess.Popen(psql+['-c',f"set application_name='{name}_first';"+ctx+first_body+'select pg_sleep(2);commit;'],env=ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);procs.append(first)
                def wait(suffix,event):
                    deadline=time.monotonic()+6
                    while time.monotonic()<deadline:
                        if query(f"select exists(select from pg_stat_activity where application_name='{name}_{suffix}' and {event})")=='t':return
                        time.sleep(.03)
                    raise AssertionError('expected concurrency wait not observed')
                wait('first',"wait_event='PgSleep'")
                second=subprocess.Popen(psql+['-c',f"set application_name='{name}_second';"+ctx+second_body+'commit;'],env=ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);procs.append(second)
                wait('second',"wait_event_type='Lock'")
                _,se=second.communicate(timeout=15);_,fe=first.communicate(timeout=15)
                assert first.returncode==0,fe
                assert second.returncode!=0 and error in se,se
            finally:
                for p in procs:
                    if p.poll() is None:p.kill();p.communicate(timeout=5)
        create=f"select menumini.staff_service_command('{venue}','CREATE_TABLE','{{\"label\":\"Concurrency table\"}}','{uid(8001)}');"
        query(ctx+create+'commit;')
        table=query("select id from menumini.dining_tables where label='Concurrency table'")
        def update(label,key):return f"select menumini.staff_service_command('{table}','UPDATE_TABLE','{{\"expectedVersion\":1,\"label\":\"{label}\",\"active\":true}}','{uid(key)}');"
        race('service_table_update',update('Concurrent winner',8002),update('Stale loser',8003),'table version conflict')
        result['cases'].append('two overlapping table edits serialize and reject the stale version')
        def opening(key):return f"select menumini.staff_service_command('{venue}','OPEN_STAFF_VISIT','{{\"tableId\":\"{table}\"}}','{uid(key)}');"
        race('service_visit_open',opening(8004),opening(8005),'one_open_visit_per_table')
        result['cases'].append('overlapping staff-only seating commands cannot open two visits on one table')
        persisted="select jsonb_build_object('tables',(select jsonb_agg(to_jsonb(t) order by id) from menumini.dining_tables t),'orders',(select jsonb_agg(to_jsonb(o) order by id) from menumini.orders o),'results',(select jsonb_agg(to_jsonb(r) order by request_key) from menumini.service_command_results r))"
        before=query(persisted);run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log']);assert query(persisted)==before
        result['cases'].append('restart preserves staff tables, orders, status versions and exact command responses')
        result['passed']=len(result['cases']);result.update(verified_at=datetime.now(timezone.utc).isoformat(),failed=0,migrations=len(list((ROOT/'MenuMini_1/database/migrations').glob('*.sql'))),concurrent_connection_cases=2,restart_verified=True,
          scope='actual server adapters and PostgreSQL with trusted fictional in-process principals; no authenticated HTTP, guest association, bank, phone or release claim')
        (ROOT/'docs/staff-service-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    finally:
        if started:run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
