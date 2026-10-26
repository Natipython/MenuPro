#!/usr/bin/env python3
"""Validate only a fresh private PostgreSQL cluster; never reads DATABASE_URL."""
from pathlib import Path
import json
import os
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
PG_CANDIDATES = sorted(Path('/usr/lib/postgresql').glob('*/bin'), key=lambda p: int(p.parent.name), reverse=True)
PG_BIN = next((p for p in PG_CANDIDATES if (p / 'initdb').exists() and (p / 'postgres').exists()), None)
if PG_BIN is None or int(PG_BIN.parent.name) < 18:
    raise SystemExit('This isolated checker requires local PostgreSQL 18+ binaries.')

ENV = {k: v for k, v in os.environ.items() if not k.startswith('PG') and k != 'DATABASE_URL'}

def run(args, **kwargs):
    result = subprocess.run([str(a) for a in args], text=True, capture_output=True, env=ENV, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr[-8000:] or result.stdout[-8000:])
    return result

with tempfile.TemporaryDirectory(prefix='menu-db-check-') as temporary:
    scratch = Path(temporary)
    data = scratch / 'data'
    socket = scratch / 'socket'
    socket.mkdir(mode=0o700)
    run([PG_BIN / 'initdb', '-D', data, '-U', 'menu_test', '--auth-local=trust', '--auth-host=reject', '--no-locale', '--encoding=UTF8'], timeout=60)
    with (data / 'postgresql.conf').open('a') as config:
        config.write(f"\nlisten_addresses = ''\nunix_socket_directories = '{socket}'\nport = 55474\n")
    started = False
    try:
        run([PG_BIN / 'pg_ctl', '-D', data, '-l', scratch / 'postgres.log', '-w', 'start'], timeout=30)
        started = True
        psql = [PG_BIN / 'psql', '-X', '-w', '-q', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '55474', '-U', 'menu_test', '-d', 'postgres']
        run(psql + ['-f', ROOT / 'MenuMini_1/database/migrations/0001_foundation.sql'], timeout=30)
        checked = run(psql + ['-f', ROOT / 'MenuMini_1/database/tests/foundation.sql'], timeout=30)
        cases = [line.split('PASS: ', 1)[1] for line in checked.stderr.splitlines() if 'PASS: ' in line]

        def wait_for_database_state(query, label):
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                if run(psql + ['-At', '-c', query], timeout=10).stdout.strip() == 't':
                    return
                time.sleep(0.03)
            raise AssertionError(f'database did not reach {label}')

        def payment_command(ledger_id, delay=0):
            return f"""begin;
set local role menu_runtime;
set local menu.merchant_id='00000000-0000-4000-8000-000000000001';
insert into menumini.payment_ledger(id,merchant_id,venue_id,order_id,kind,method,verification_source,amount,client_request_key,request_hash,recorded_by)
values('{ledger_id}','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000703','RECEIPT','CASH','CASH_CONFIRMED',100,'{ledger_id}',repeat('5',64),'00000000-0000-4000-8000-000000000011');
insert into menumini.audit_events(merchant_id,actor_user_id,action,entity_type,entity_id)
values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','PAYMENT_RECORDED','payment_ledger','{ledger_id}');
insert into menumini.outbox_events(merchant_id,venue_id,aggregate_id,event_type,payload)
values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000703','PAYMENT_RECORDED',jsonb_build_object('ledgerId','{ledger_id}'));
select 'LOCKED'; select pg_sleep({delay}); commit;"""

        # First connection holds the order lock. Second must see its committed receipt.
        first_sql = "set application_name='menu_payment_first'; " + payment_command('00000000-0000-4000-8000-000000000911', 3)
        first = subprocess.Popen(psql + ['-At', '-c', first_sql],
                                 text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=ENV)
        wait_for_database_state("select exists(select from pg_stat_activity where application_name='menu_payment_first' and wait_event='PgSleep');", 'first receipt holding its order lock')
        second_sql = "set application_name='menu_payment_second'; " + payment_command('00000000-0000-4000-8000-000000000912')
        second = subprocess.Popen(psql + ['-At', '-c', second_sql], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=ENV)
        wait_for_database_state("select exists(select from pg_stat_activity where application_name='menu_payment_second' and wait_event_type='Lock');", 'second receipt waiting for the same order')
        _, second_error = second.communicate(timeout=15)
        _, first_error = first.communicate(timeout=15)
        assert first.returncode == 0, first_error
        assert second.returncode != 0 and 'payment exceeds order balance' in second_error, second_error
        balance = run(psql + ['-At', '-c', "select net_paid_amount from menumini.order_payment_balances where order_id='00000000-0000-4000-8000-000000000703';"], timeout=10).stdout.strip()
        assert balance == '100.00', balance
        cases.append('concurrent receipts cannot exceed the order total')

        # Queued rows are claimed by different connections without blocking one another.
        claim_sql = "set application_name='menu_outbox_first'; begin; set local role menu_runtime; set local menu.merchant_id='00000000-0000-4000-8000-000000000001'; select id from menumini.outbox_events where status='PENDING' order by id limit 1 for update skip locked; select pg_sleep(3); rollback;"
        worker = subprocess.Popen(psql + ['-At', '-c', claim_sql], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=ENV)
        wait_for_database_state("select exists(select from pg_stat_activity where application_name='menu_outbox_first' and wait_event='PgSleep');", 'outbox row lock held by first worker')
        other_event = run(psql + ['-At', '-c', "begin; set local role menu_runtime; set local menu.merchant_id='00000000-0000-4000-8000-000000000001'; select id from menumini.outbox_events where status='PENDING' order by id limit 1 for update skip locked; rollback;"], timeout=10).stdout.strip()
        worker_output, worker_error = worker.communicate(timeout=15)
        held_event = worker_output.splitlines()[0].strip()
        assert worker.returncode == 0, worker_error
        assert held_event and other_event and held_event != other_event
        cases.append('two outbox workers claim different locked rows')
        result = {'database': 'isolated native PostgreSQL 18+', 'passed': len(cases), 'failed': 0, 'cases': cases,
                  'scope': 'database integrity and two real concurrent-connection cases; no API/browser/release claim'}
        print(json.dumps(result, indent=2))
    finally:
        if started:
            run([PG_BIN / 'pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'], timeout=30)
