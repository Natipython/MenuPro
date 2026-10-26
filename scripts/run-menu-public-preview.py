#!/usr/bin/env python3
"""Real PostgreSQL-backed customer preview with disposable fictional fixtures only."""
from pathlib import Path
import argparse, json, os, signal, subprocess, tempfile

ROOT=Path(__file__).resolve().parents[1]
PG_BIN=next((p for p in sorted(Path('/usr/lib/postgresql').glob('*/bin'),key=lambda p:int(p.parent.name),reverse=True)
             if (p/'initdb').exists() and int(p.parent.name)>=18),None)
if PG_BIN is None: raise SystemExit('Local PostgreSQL 18+ is required.')
parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=5196); args=parser.parse_args()
assert 1024<=args.port<=65535
ENV={k:v for k,v in os.environ.items() if not k.startswith('PG') and k not in ('DATABASE_URL','MENU_PUBLIC_DATABASE_URL','MENU_PUBLIC_FIXTURE_CONFIG','MENU_PUBLIC_ORIGIN','MENU_MERCHANT_DATABASE_URL','MENU_MERCHANT_FIXTURE_CONFIG','MENU_GUEST_DATABASE_URL','MENU_GUEST_FIXTURE_CONFIG','MENU_GUEST_CAPABILITY_KEY')}
def run(command,timeout=60):
    result=subprocess.run([str(a) for a in command],env=ENV,text=True,capture_output=True,timeout=timeout)
    if result.returncode: raise RuntimeError(result.stderr[-3000:])
    return result.stdout.strip()
with tempfile.TemporaryDirectory(prefix='menumini-public-') as temporary:
    scratch=Path(temporary); data=scratch/'data'; socket=scratch/'socket'; socket.mkdir(mode=0o700)
    run([PG_BIN/'initdb','-D',data,'-U','menu_test','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'])
    with (data/'postgresql.conf').open('a') as f:
        f.write(f"\nlisten_addresses = ''\nunix_socket_directories = '{socket}'\nport = 55477\n")
    started=False; server=None
    try:
        run([PG_BIN/'pg_ctl','-D',data,'-l',scratch/'postgres.log','-w','start']); started=True
        psql=[PG_BIN/'psql','-X','-w','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p','55477','-U','menu_test','-d','postgres']
        for migration in sorted((ROOT/'MenuMini_1/database/migrations').glob('*.sql')): run(psql+['-f',migration])
        run(psql+['-f',ROOT/'MenuMini_1/database/tests/workflow.sql','-f',ROOT/'MenuMini_1/database/tests/mini-two-branches.sql','-f',ROOT/'MenuMini_1/database/tests/catalog.sql'])
        run(psql+['-c','create role menu_customer login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_public to menu_customer;'])
        venue=run(psql+['-c',"select id from menumini.venues where public_slug='fictional-published-cafe'"])
        manifest={'marker':'menumini-fictional-public-preview','socket':str(socket),'port':55477,'data':str(data),
                  'database':'postgres','admin_user':'menu_test','venue_id':venue,'http_origin':f'http://127.0.0.1:{args.port}'}
        (scratch/'fixture.json').write_text(json.dumps(manifest,indent=2)+'\n')
        public_config={'host':str(socket),'port':55477,'database':'postgres','user':'menu_customer'}
        server_env={**ENV,'NODE_ENV':'development','MENUMINI_PREVIEW_PORT':str(args.port),'MENU_PUBLIC_FIXTURE_CONFIG':json.dumps(public_config)}
        print(f'Fictional fixture directory: {scratch}',flush=True)
        print(f'Customer menu: http://127.0.0.1:{args.port}/menu/fictional-published-cafe',flush=True)
        print('No real accounts, OTP, billing or existing database connections. Ctrl+C stops and removes this fixture.',flush=True)
        server=subprocess.Popen(['node','scripts/setup-preview.mjs'],cwd=ROOT/'MenuMini_1',env=server_env)
        server.wait()
    except KeyboardInterrupt: pass
    finally:
        if server and server.poll() is None:
            server.terminate()
            try: server.wait(timeout=10)
            except subprocess.TimeoutExpired: server.kill(); server.wait(timeout=5)
        if started: run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
