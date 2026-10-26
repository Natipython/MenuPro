#!/usr/bin/env python3
"""Cashier adapters, real concurrency and restart on fictional PG only."""
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
        output=run(['node','scripts/check-cashier-settlement.mjs'],timeout=100,cwd=ROOT/'MenuMini_1',env={**ENV,'NODE_ENV':'development','MENU_MERCHANT_FIXTURE_CONFIG':json.dumps(config)})
        parsed=json.loads(output[output.index('{"cashier_result":'):]);result=parsed['cashier_result'];fixture=parsed['concurrency_fixture']
        def query(sql):return run(psql+['-c',sql])
        def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
        venue=query("select id from menumini.venues where public_slug='fictional-published-cafe'")
        ctx=f"begin;set local role menu_runtime;set local menu.merchant_id='{uid(41)}';set local menu.user_id='{uid(416)}';"
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
                assert (second.returncode!=0 and error in se) if error else second.returncode==0,se
            finally:
                for p in procs:
                    if p.poll() is None:p.kill();p.communicate(timeout=5)
        version=fixture['version'];bill=fixture['bill'];receipt=fixture['receipt']
        def allocate(amount,key):return f"select menumini.cashier_command('{receipt}','ALLOCATE_RECEIPT','{{\"billId\":\"{bill}\",\"expectedBillVersion\":{version},\"amount\":\"{amount}\"}}','{uid(key)}');"
        race('cashier_allocation',allocate('160.00',8501),allocate('80.00',8502),'bill version/state conflict')
        result['cases'].append('two overlapping allocations serialize and cannot spend the same received funds twice')
        version=query(f"select version from menumini.bills where id='{bill}'")
        close=f"select menumini.cashier_command('{bill}','CLOSE_BILL','{{\"expectedVersion\":{version}}}','{uid(8503)}');"
        late=f"select menumini.cashier_command('{bill}','RECORD_RECEIPT','{{\"method\":\"CASH\",\"receivedAmount\":\"10.00\",\"tenderedAmount\":\"10.00\",\"changeAmount\":\"0.00\",\"verificationNote\":\"Fictional late receipt\",\"fundsConfirmed\":true}}','{uid(8504)}');"
        race('cashier_late_receipt',close,late,None)
        assert query(f"select status='FINALIZED' and (select unapplied=10 from menumini.bill_balance('{bill}')) from menumini.bills where id='{bill}'")=='t'
        result['cases'].append('closure racing a late receipt preserves funds and reopens financial resolution')
        persisted="select jsonb_build_object('bills',(select jsonb_agg(to_jsonb(t) order by id) from menumini.bills t),'receipts',(select jsonb_agg(to_jsonb(o) order by id) from menumini.recorded_receipts o),'allocations',(select jsonb_agg(to_jsonb(a) order by id) from menumini.payment_allocations a),'refunds',(select jsonb_agg(to_jsonb(q) order by id) from menumini.refund_requests q),'results',(select jsonb_agg(to_jsonb(r) order by request_key) from menumini.service_command_results r))"
        before=query(persisted);run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log']);assert query(persisted)==before
        result['cases'].append('restart preserves bills, receipt facts, allocations, refund versions and exact command responses')
        result['passed']=len(result['cases']);result.update(verified_at=datetime.now(timezone.utc).isoformat(),failed=0,migrations=len(list((ROOT/'MenuMini_1/database/migrations').glob('*.sql'))),concurrent_connection_cases=2,restart_verified=True,
          scope='actual cashier adapters and PostgreSQL with trusted fictional principals; no authenticated HTTP, real bank or physical device acceptance')
        (ROOT/'docs/cashier-settlement-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    finally:
        if started:run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
