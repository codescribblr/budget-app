#!/usr/bin/env python3
"""Integration checks against a disposable local Postgres 17 database only."""
import concurrent.futures, importlib.util, os, subprocess, tempfile, time
from pathlib import Path
from urllib.parse import urlsplit
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('runner',root/'scripts/migration-runner.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
spec=importlib.util.spec_from_file_location('pg',root/'scripts/pg-with-url.py');pg=importlib.util.module_from_spec(spec);spec.loader.exec_module(pg)
url=os.environ['TEST_DATABASE_URL'];parsed=urlsplit(url)
assert parsed.hostname in ('localhost','127.0.0.1') and parsed.path.startswith('/budget_release_test'), 'Disposable local test database required'
env=pg.connection_env(url)
def sql(source,ok=True):
 result=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input=source,text=True,capture_output=True,env=env)
 if ok and result.returncode:raise AssertionError(result.stderr)
 if not ok:assert result.returncode!=0
 return result.stdout.strip()
assert sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'")=='0', 'Test database must be empty'
with tempfile.TemporaryDirectory() as directory:
 path=Path(directory)
 path.joinpath('001_atomic.sql').write_text('BEGIN; CREATE TABLE atomic_probe(id int); INSERT INTO atomic_probe VALUES(1); SELECT 1/0; COMMIT;')
 script,_=runner.render(path,'pre-deploy');sql(script,False)
 assert sql("SELECT to_regclass('public.atomic_probe') IS NULL")=='t'
 assert sql('SELECT count(*) FROM public._migrations')=='0'
 path.joinpath('001_atomic.sql').write_text('BEGIN; CREATE TABLE atomic_probe(id int); SELECT pg_sleep(1); INSERT INTO atomic_probe VALUES(1); COMMIT;')
 path.joinpath('002_contract.sql').write_text('-- migration-phase: post-deploy\nCREATE TABLE contract_probe(id int);')
 script,_=runner.render(path,'pre-deploy')
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(sql,script) for _ in range(2)]
  for future in futures:future.result()
 assert sql('SELECT count(*) FROM atomic_probe')=='1'
 assert sql("SELECT to_regclass('public.contract_probe') IS NULL")=='t'
 sql(runner.render(path,'post-deploy')[0]);assert sql('SELECT count(*) FROM public._migrations')=='2'
print('PASS: concurrent migration runners serialize; SQL and history roll back together; phases stay separate')
sql("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$; CREATE TABLE scheduled_jobs(id bigserial PRIMARY KEY,job_type text NOT NULL,status text NOT NULL,scheduled_for timestamptz NOT NULL,started_at timestamptz,completed_at timestamptz,error_message text,metadata jsonb);")
sql((root/'migrations/156_atomic_scheduled_job_claims.sql').read_text())
sql("INSERT INTO scheduled_jobs(job_type,status,scheduled_for) VALUES('proof','pending',now()-interval '1 minute')")
tokens=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002']
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(lambda token:sql(f"SET ROLE service_role; SELECT count(*) FROM claim_scheduled_job(1,'{token}');"),tokens))
assert sorted(results)==['0','1']
winner=tokens[results.index('1')];loser=tokens[results.index('0')]
assert sql(f"SELECT renew_scheduled_job(1,'{loser}')")=='f'
assert sql(f"SELECT finish_scheduled_job(1,'{loser}',true,'wrong',now()+interval '1 day')")=='f'
assert sql(f"SELECT renew_scheduled_job(1,'{winner}')")=='t'
assert sql(f"SELECT finish_scheduled_job(1,'{winner}',true,'done',now()+interval '1 day')")=='t'
assert sql('SELECT status FROM scheduled_jobs WHERE id=1')=='completed'
assert sql("SELECT count(*) FROM scheduled_jobs WHERE job_type='proof' AND status='pending'")=='1'
sql("INSERT INTO scheduled_jobs(job_type,status,scheduled_for) VALUES('proof','pending',now())",False)
assert sql(f"SELECT count(*) FROM claim_scheduled_job(1,'{winner}')")=='0'
sql("UPDATE scheduled_jobs SET scheduled_for=now()-interval '1 minute' WHERE id=2")
assert sql(f"SELECT count(*) FROM claim_scheduled_job(2,'{winner}')")=='1'
sql("UPDATE scheduled_jobs SET lease_expires_at=now()-interval '1 second' WHERE id=2")
assert sql(f"SELECT finish_scheduled_job(2,'{winner}',true,'late',NULL)")=='f'
assert sql('SELECT expire_scheduled_job_leases()')=='1'
assert sql(f"SELECT count(*) FROM claim_scheduled_job(2,'{loser}')")=='0'
assert sql('SELECT status FROM scheduled_jobs WHERE id=2')=='failed'
for role in ('anon','authenticated'):
 sql(f"SET ROLE {role}; SELECT claim_scheduled_job(1,'{loser}');",False)
assert sql('SELECT sum(attempt) FROM scheduled_jobs')=='2'
print('PASS: only one worker claims a due job; stale tokens cannot renew/finish; expired jobs require review; browser roles denied')
