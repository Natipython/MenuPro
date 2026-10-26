#!/usr/bin/env python3
"""Exercise actual server adapters on isolated fictional PG; no sign-in bypass."""
from pathlib import Path
import json, os, subprocess, tempfile
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
PG_BIN=next((p for p in sorted(Path('/usr/lib/postgresql').glob('*/bin'),key=lambda p:int(p.parent.name),reverse=True)
             if (p/'initdb').exists() and int(p.parent.name)>=18),None)
if PG_BIN is None: raise SystemExit('Local PostgreSQL 18+ is required.')
ENV={k:v for k,v in os.environ.items() if not k.startswith('PG') and k not in ('DATABASE_URL','MENU_MERCHANT_DATABASE_URL','MENU_MERCHANT_FIXTURE_CONFIG')}
def run(args,timeout=60,env=ENV,cwd=None):
    r=subprocess.run([str(a) for a in args],text=True,capture_output=True,env=env,cwd=cwd,timeout=timeout)
    if r.returncode: raise RuntimeError(r.stderr[-5000:] or r.stdout[-5000:])
    return r.stdout.strip()
with tempfile.TemporaryDirectory(prefix='menumini-workspace-') as tmp:
    scratch=Path(tmp); data=scratch/'data'; socket=scratch/'socket'; socket.mkdir(mode=0o700)
    run([PG_BIN/'initdb','-D',data,'-U','menu_test','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'])
    with (data/'postgresql.conf').open('a') as f: f.write(f"\nlisten_addresses=''\nunix_socket_directories='{socket}'\nport=55478\n")
    started=False
    try:
        run([PG_BIN/'pg_ctl','-D',data,'-l',scratch/'postgres.log','-w','start']); started=True
        psql=[PG_BIN/'psql','-X','-w','-q','-At','-v','ON_ERROR_STOP=1','-h',socket,'-p','55478','-U','menu_test','-d','postgres']
        for path in sorted((ROOT/'MenuMini_1/database/migrations').glob('*.sql')): run(psql+['-f',path])
        run(psql+['-f',ROOT/'MenuMini_1/database/tests/workflow.sql','-f',ROOT/'MenuMini_1/database/tests/mini-two-branches.sql','-f',ROOT/'MenuMini_1/database/tests/catalog.sql'])
        run(psql+['-c','create role menu_workspace_runtime login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit; grant menu_runtime to menu_workspace_runtime;'])
        config={'host':str(socket),'port':55478,'user':'menu_workspace_runtime','database':'postgres'}
        output=run(['node','scripts/check-merchant-workspace.mjs'],timeout=90,cwd=ROOT/'MenuMini_1',env={**ENV,'NODE_ENV':'development','MENU_MERCHANT_FIXTURE_CONFIG':json.dumps(config)})
        result=json.loads(output[output.index('{"workspace_result":'):])['workspace_result']
        projection_sql="select jsonb_agg(jsonb_build_object('venueId',venue_id,'version',version,'content',content)) from menumini.service_drafts"
        before=run(psql+['-c',projection_sql])
        run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','restart','-l',scratch/'postgres.log'])
        assert run(psql+['-c',projection_sql])==before
        result['cases'].append('database restart preserves private service preparation and version'); result['passed']+=1
        result.update(verified_at=datetime.now(timezone.utc).isoformat(),restart_verified=True,
          scope='real private server command/response adapters and PostgreSQL, trusted fictional principals supplied in-process; not authenticated HTTP or real users')
        (ROOT/'docs/merchant-workspace-validation.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result,indent=2))
    finally:
        if started: run([PG_BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
