#!/usr/bin/env python3
"""Apply v1 + v2 to a fresh private cluster and exercise workflow invariants."""
from pathlib import Path
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
PG_BIN=next((p for p in sorted(Path('/usr/lib/postgresql').glob('*/bin'),key=lambda p:int(p.parent.name),reverse=True)
             if (p/'initdb').exists() and int(p.parent.name)>=18),None)
if PG_BIN is None: raise SystemExit('Local PostgreSQL 18+ is required.')
ENV={k:v for k,v in os.environ.items() if not k.startswith('PG') and k!='DATABASE_URL'}
def run(args, timeout=30):
    r=subprocess.run([str(a) for a in args],text=True,capture_output=True,env=ENV,timeout=timeout)
    if r.returncode: raise RuntimeError(r.stderr[-7000:] or r.stdout[-7000:])
    return r

with tempfile.TemporaryDirectory(prefix='menu-workflow-db-') as temporary:
    scratch=Path(temporary); data=scratch/'data'; socket=scratch/'socket'; socket.mkdir(mode=0o700)
    run([PG_BIN/'initdb','-D',data,'-U','menu_test','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'],60)
    with (data/'postgresql.conf').open('a') as f:
        f.write(f"\nlisten_addresses = ''\nunix_socket_directories = '{socket}'\nport = 55476\n")
    started=False
    try:
        run([PG_BIN/'pg_ctl','-D',data,'-l',scratch/'postgres.log','-w','start']); started=True
        psql=[PG_BIN/'psql','-X','-w','-q','-v','ON_ERROR_STOP=1','-h',socket,'-p','55476','-U','menu_test','-d','postgres']
        for name in ('0001_foundation.sql','0002_workflow.sql','0003_mini_two_branches.sql','0004_phone_identity_fields.sql','0005_menu_publication.sql','0006_service_preparation.sql','0007_staff_service.sql','0008_cashier_settlement.sql','0009_guest_ordering.sql','0010_payer_claims.sql','0011_command_recovery.sql'):
            run(psql+['-f',ROOT/'MenuMini_1/database/migrations'/name])
        checked=run(psql+['-At','-f',ROOT/'MenuMini_1/database/tests/workflow.sql','-f',ROOT/'MenuMini_1/database/tests/mini-two-branches.sql','-f',ROOT/'MenuMini_1/database/tests/catalog.sql'])
        cases=[line.split('PASS: ',1)[1] for line in checked.stderr.splitlines() if 'PASS: ' in line]
        examples=[json.loads(line.removeprefix('EXAMPLE:')) for line in checked.stdout.splitlines() if line.startswith('EXAMPLE:')]
        catalog_examples=[json.loads(line.removeprefix('CATALOG_EXAMPLE:')) for line in checked.stdout.splitlines() if line.startswith('CATALOG_EXAMPLE:')]
        def query(sql): return run(psql+['-At','-c',sql]).stdout.strip()
        def uid(number): return f'00000000-0000-4000-8000-{number:012d}'
        venue=query("select id from menumini.venues where merchant_id='"+uid(1)+"'")
        def context(merchant=1,user=11):
            return f"begin; set local role menu_runtime; set local menu.merchant_id='{uid(merchant)}'; set local menu.user_id='{uid(user)}'; "
        def wait_state(name,event):
            deadline=time.monotonic()+6
            while time.monotonic()<deadline:
                if query(f"select exists(select from pg_stat_activity where application_name='{name}' and {event});")=='t': return
                time.sleep(.03)
            raise AssertionError(f'{name} did not reach expected database wait: {event}')
        def race(name, first_body, second_body, expected_error):
            processes=[]
            try:
                first=subprocess.Popen(psql+['-At','-c',f"set application_name='{name}_first'; "+first_body+' select pg_sleep(3); commit;'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=ENV); processes.append(first)
                wait_state(name+'_first',"wait_event='PgSleep'")
                second=subprocess.Popen(psql+['-At','-c',f"set application_name='{name}_second'; "+second_body+' commit;'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=ENV); processes.append(second)
                wait_state(name+'_second',"wait_event_type='Lock'")
                _,second_error=second.communicate(timeout=15)
                _,first_error=first.communicate(timeout=15)
                assert first.returncode==0,first_error
                if expected_error is None: assert second.returncode==0,second_error
                else: assert second.returncode!=0 and expected_error in second_error,second_error
            finally:
                for process in processes:
                    if process.poll() is None: process.kill(); process.communicate(timeout=5)

        bill=query(f"select id from menumini.bills where venue_id='{venue}' and visit_id=(select id from menumini.table_visits where table_id='{uid(202)}' and status='OPEN')")
        receipt=query(f"select id from menumini.recorded_receipts where context_bill_id='{bill}'")
        version=query(f"select version from menumini.bills where id='{bill}'")
        def allocation(key):
            return context()+f"select menumini.allocate_receipt('{receipt}','{bill}',{version},70,'{uid(key)}');"
        race('workflow_allocation',allocation(901),allocation(902),'bill version/state conflict')
        assert query(f"select sum(amount) from menumini.payment_allocations where receipt_id='{receipt}'")=='70.00'
        cases.append('two real concurrent allocators cannot spend the same receipt twice')

        visit=query(f"select id from menumini.table_visits where table_id='{uid(203)}' and status='OPEN'")
        final_bill=query(f"select id from menumini.bills where visit_id='{visit}'")
        selections=json.dumps([{'itemId':uid(701),'quantity':1,'choiceIds':[]}])
        first_order=context()+f"select menumini.submit_workflow_order('{venue}','{visit}','{uid(401)}','{selections}'::jsonb,'','STAFF','{uid(903)}');"
        finalization=context()+f"select menumini.change_bill_state('{final_bill}',1,'FINALIZED','{uid(904)}');"
        race('workflow_finalization',first_order,finalization,'resolve pending order requests before finalization')
        assert query(f"select status from menumini.bills where id='{final_bill}'")=='OPEN'
        cases.append('bill finalization waits for overlapping order and refuses unresolved submitted work')

        race('workflow_capacity',context(3,13)+f"select menumini.create_branch('Fictional C One','fictional-c-one','{uid(905)}');",
             context(3,13)+f"select menumini.create_branch('Fictional C Two','fictional-c-two','{uid(906)}');",'active branch capacity exceeded')
        assert query(f"select count(*) from menumini.venues where merchant_id='{uid(3)}' and archived_at is null")=='2'
        cases.append('overlapping branch creations allow the second Mini branch and reject a third')

        catalog_venue=query("select id from menumini.venues where public_slug='fictional-published-cafe'")
        catalog_content=json.loads(query(f"select content from menumini.menu_drafts where venue_id='{catalog_venue}'"))
        def save_catalog(price,expected,key):
            from copy import deepcopy
            content=deepcopy(catalog_content); content['sections'][0]['items'][0]['basePrice']=price
            body=json.dumps(content,ensure_ascii=False).replace("'","''")
            return context(41,411)+f"select menumini.save_menu_draft('{catalog_venue}',{expected},'{body}'::jsonb,'{uid(key)}');"
        race('catalog_save',save_catalog('75.00',2,4401),save_catalog('80.00',2,4402),'menu draft version conflict')
        assert query(f"select version from menumini.menu_drafts where venue_id='{catalog_venue}'")=='3'
        cases.append('overlapping menu saves serialize and reject a stale editor instead of losing an edit')
        publication=context(41,411)+f"select menumini.publish_menu('{catalog_venue}',3,2,'{uid(4403)}');"
        race('catalog_publish_save',publication,save_catalog('80.00',3,4404),None)
        assert query("select menumini.read_public_menu('fictional-published-cafe')#>>'{content,sections,0,items,0,basePrice}'")=='75.00'
        assert query(f"select content#>>'{{sections,0,items,0,basePrice}}' from menumini.menu_drafts where venue_id='{catalog_venue}'")=='80.00'
        cases.append('an overlapping publication commits its reviewed version and later draft save cannot change that live price')
        publication=context(41,411)+f"select menumini.publish_menu('{catalog_venue}',4,2,'{uid(4405)}');"
        race('catalog_publish_retry',publication,publication,None)
        assert query(f"select count(*) from menumini.menu_publications where venue_id='{catalog_venue}'")=='4'
        cases.append('two overlapping publication retries with the same key create only one publication')
        catalog_before=query("select menumini.read_public_menu('fictional-published-cafe')")
        query(context(41,411)+f"select menumini.publish_menu('{catalog_venue}',4,2,'{uid(4406)}'); rollback;")
        assert query("select menumini.read_public_menu('fictional-published-cafe')")==catalog_before
        assert query(f"select count(*) from menumini.workflow_requests where merchant_id='{uid(41)}' and request_key='{uid(4406)}'")=='0'
        cases.append('rolled-back publication leaves no route switch, publication, command result or delivery event')
        service={'tableLabels':['Table 1'],'staffing':{'orders':'OWNER','preparation':'OWNER','payments':'OWNER'},
                 'paymentMethods':['CASH'],'pricing':'UNCONFIRMED'}
        def save_service(pricing,expected,key):
            content={**service,'pricing':pricing}; body=json.dumps(content).replace("'","''")
            return context(41,411)+f"select menumini.save_service_draft('{catalog_venue}',{expected},'{body}'::jsonb,'{uid(key)}');"
        query(save_service('UNCONFIRMED',0,4450)+'commit;')
        race('service_save',save_service('NO_ADDED_CHARGES',1,4451),save_service('REVIEW_REQUIRED',1,4452),'service draft version conflict')
        assert query(f"select version from menumini.service_drafts where venue_id='{catalog_venue}'")=='2'
        cases.append('overlapping service preparation saves reject the stale version without changing active service')
        service_before=query(f"select jsonb_build_object('version',version,'content',content) from menumini.service_drafts where venue_id='{catalog_venue}'")
        draft_before=query(f"select jsonb_build_object('version',version,'content',content) from menumini.menu_drafts where venue_id='{catalog_venue}'")
        profile_before=query(f"select content from menumini.branch_profile_drafts where venue_id='{catalog_venue}'")
        before=query('select count(*) from menumini.recorded_receipts')
        run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log'])
        assert query('select count(*) from menumini.recorded_receipts')==before
        assert query(f"select sum(amount) from menumini.payment_allocations where receipt_id='{receipt}'")=='70.00'
        cases.append('database restart preserves committed receipts and allocations')
        assert query("select menumini.read_public_menu('fictional-published-cafe')")==catalog_before
        assert query(f"select jsonb_build_object('version',version,'content',content) from menumini.menu_drafts where venue_id='{catalog_venue}'")==draft_before
        assert query(f"select content from menumini.branch_profile_drafts where venue_id='{catalog_venue}'")==profile_before
        cases.append('database restart preserves private branch/menu drafts, public route, prices and sold-out overrides')
        assert query(f"select jsonb_build_object('version',version,'content',content) from menumini.service_drafts where venue_id='{catalog_venue}'")==service_before
        cases.append('database restart preserves private service draft and concurrency-selected version')
        result={'database':'private PostgreSQL 18+','migrations':['0001','0002','0003','0004','0005','0006','0007','0008','0009','0010','0011'],
                          'verified_at':datetime.now(timezone.utc).isoformat(),
                          'passed':len(cases),'failed':0,'cases':cases,
                          'concurrent_connection_cases':7,'projection_examples':len(examples),'catalog_projection_examples':len(catalog_examples),
                          'scope':'database workflow/permission integrity and restart only; no HTTP, bank, device or release claim'}
        (ROOT/'docs/workflow-db-validation.json').write_text(json.dumps(result,indent=2)+'\n')
        (ROOT/'docs/contracts/workflow-v2-db-examples.json').write_text(json.dumps(examples,indent=2)+'\n')
        (ROOT/'docs/contracts/catalog-db-examples.json').write_text(json.dumps(catalog_examples,indent=2)+'\n')
        print(json.dumps(result,indent=2))
    finally:
        if started: run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
