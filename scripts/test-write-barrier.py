#!/usr/bin/env python3
"""Cutover concurrency/security tests, disposable LOCAL Postgres only."""
import concurrent.futures, importlib.util, os, subprocess, time
from pathlib import Path
from urllib.parse import urlsplit
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('pg',root/'scripts/pg-with-url.py');pg=importlib.util.module_from_spec(spec);spec.loader.exec_module(pg)
url=os.environ['TEST_DATABASE_URL'];parsed=urlsplit(url)
assert parsed.hostname in ('localhost','127.0.0.1') and parsed.path.startswith('/budget_release_test'), 'Disposable local database required'
env=pg.connection_env(url)
def run(source,ok=True,session=None):
 current=env.copy()
 if session:current.update(PGUSER=session,PGPASSWORD='local-proof-only')
 result=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input=source,text=True,capture_output=True,env=current)
 if ok and result.returncode:raise AssertionError(result.stderr)
 if not ok:assert result.returncode, 'Unexpectedly accepted blocked SQL'
 return result.stdout.strip() if ok else result.stderr
assert run("SELECT to_regnamespace('budget_ops') IS NULL")=='t', 'Fresh test database required'
run("""
DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE ROLE barrier_authenticator LOGIN NOINHERIT PASSWORD 'local-proof-only';
GRANT anon, authenticated, service_role TO barrier_authenticator;
CREATE TABLE barrier_probe(id int PRIMARY KEY, value text NOT NULL);
INSERT INTO barrier_probe VALUES(1,'original');
GRANT ALL ON barrier_probe TO anon, authenticated, service_role;
CREATE FUNCTION public.barrier_definer_write() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ UPDATE public.barrier_probe SET value='definer' WHERE id=1 $$;
CREATE FUNCTION public.barrier_fake_bypass() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN PERFORM set_config('budget_ops.operator_bypass','on',true); UPDATE public.barrier_probe SET value='bypass' WHERE id=1; END $$;
CREATE TABLE barrier_partition(id int, value text) PARTITION BY RANGE(id);
CREATE TABLE barrier_partition_child PARTITION OF barrier_partition FOR VALUES FROM(0) TO(100);
GRANT ALL ON barrier_partition,barrier_partition_child TO anon, authenticated, service_role;
""")
installer=(root/'scripts/cutover/install-write-barrier.sql').read_text()
run(installer)
def client(source,ok=True,role='authenticated'):
 return run(f'SET ROLE {role}; '+source,ok,session='barrier_authenticator')
def freeze(on=True,reason='Isolated maintenance rehearsal'):
 return run(f"SELECT budget_ops.set_write_freeze({str(on).lower()},'{reason}')")
client("INSERT INTO barrier_probe VALUES(2,'allowed')")
client("UPDATE barrier_probe SET value='normal' WHERE id=1",role='service_role')
assert client('SELECT count(*) FROM barrier_probe')=='2'
freeze()
for role in ('anon','authenticated','service_role'):
 for statement in ["INSERT INTO barrier_probe VALUES(3,'bad')", "UPDATE barrier_probe SET value='bad' WHERE id=1", 'DELETE FROM barrier_probe WHERE id=1', 'TRUNCATE barrier_probe', "INSERT INTO barrier_probe VALUES(1,'bad') ON CONFLICT(id) DO UPDATE SET value=excluded.value", 'SELECT public.barrier_definer_write()', "INSERT INTO barrier_partition VALUES(1,'bad')", "INSERT INTO barrier_partition_child VALUES(1,'bad')"]:
  assert 'paused for maintenance' in client(statement,False,role)
 assert 'Direct operator connection' in client('SELECT public.barrier_fake_bypass()',False,role)
 assert 'permission denied' in client("SELECT budget_ops.set_write_freeze(false,'forged request')",False,role)
 assert 'permission denied' in client('SELECT * FROM budget_ops.write_control',False,role)
 assert client('SELECT count(*) FROM barrier_probe')=='2'
assert run('SELECT count(*) FROM barrier_probe')=='2'
assert 'paused for maintenance' in run("UPDATE barrier_probe SET value='bad'",False)
# Explicit direct operator bypass, limited to one transaction, is the only escape.
run("BEGIN; SET LOCAL budget_ops.operator_bypass='on'; UPDATE barrier_probe SET value='operator' WHERE id=1; COMMIT;")
assert 'paused for maintenance' in run("UPDATE barrier_probe SET value='bad'",False)
# Reapplying installer must never reopen a frozen database.
run(installer)
assert run('SELECT frozen FROM budget_ops.write_control')=='t'
run('ALTER TABLE barrier_probe DISABLE TRIGGER budget_cutover_write_barrier')
assert 'Unprotected application tables' in run('SELECT budget_ops.assert_write_coverage()',False)
run('ALTER TABLE barrier_probe ENABLE ALWAYS TRIGGER budget_cutover_write_barrier')
run('CREATE TABLE barrier_new_table(id int)')
assert 'Unprotected application tables' in run("SELECT budget_ops.set_write_freeze(false,'coverage must block')",False)
assert run('SELECT frozen FROM budget_ops.write_control')=='t'
run(installer)
freeze(False)
print('PASS: frozen INSERT/UPDATE/DELETE/TRUNCATE/upsert, partitions, privileged RPCs and forged bypass denied; reads and explicit operator bypass work; coverage and reruns fail safely')
# A transaction which has written must COMMIT before freeze can finish. A writer
# arriving behind the control change must observe frozen, not a stale snapshot.
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 writer=pool.submit(client,"BEGIN; SET application_name='barrier-old-writer'; UPDATE barrier_probe SET value='before-freeze' WHERE id=1; SELECT pg_sleep(1.5); COMMIT;")
 deadline=time.monotonic()+5
 while run("SELECT count(*) FROM pg_stat_activity WHERE application_name='barrier-old-writer' AND wait_event='PgSleep'")!='1':
  assert time.monotonic()<deadline;time.sleep(.03)
 control=pool.submit(freeze)
 deadline=time.monotonic()+5
 while run("SELECT count(*) FROM pg_stat_activity WHERE query LIKE 'SELECT budget_ops.set_write_freeze(true,%' AND wait_event_type='Lock'")!='1':
  assert time.monotonic()<deadline;time.sleep(.03)
 assert not control.done()
 writer.result();control.result()
 assert 'paused for maintenance' in client("UPDATE barrier_probe SET value='after-freeze' WHERE id=1",False)
assert run('SELECT value FROM barrier_probe WHERE id=1')=='before-freeze'
print('PASS: freeze cannot acknowledge until the complete old transaction drains; subsequent writers are denied')
freeze(False)
# Hold the exclusive state update before commit so the next statement is known
# to wait behind it. Shared readers can join existing shared locks before an
# updater obtains its lock; those writes are also drained before acknowledgement.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 control=pool.submit(run,"BEGIN; SET application_name='barrier-control-commit'; SELECT budget_ops.set_write_freeze(true,'queued writer proof'); SELECT pg_sleep(1.2); COMMIT;")
 deadline=time.monotonic()+5
 while run("SELECT count(*) FROM pg_stat_activity WHERE application_name='barrier-control-commit' AND wait_event='PgSleep'")!='1':
  assert time.monotonic()<deadline;time.sleep(.03)
 queued=pool.submit(client,"UPDATE barrier_probe SET value='queued-write' WHERE id=1",False)
 control.result()
 assert 'paused for maintenance' in queued.result()
assert run('SELECT value FROM barrier_probe WHERE id=1')=='before-freeze'
print('PASS: a queued writer observes the committed freeze, not its earlier statement snapshot')
freeze(False)
# A long-lived repeatable-read transaction must not use its old open snapshot.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 stale=pool.submit(client,"BEGIN ISOLATION LEVEL REPEATABLE READ; SET application_name='barrier-stale-snapshot'; SELECT count(*) FROM barrier_probe; SELECT pg_sleep(1.2); UPDATE barrier_probe SET value='stale-write' WHERE id=1; COMMIT;",False)
 deadline=time.monotonic()+5
 while run("SELECT count(*) FROM pg_stat_activity WHERE application_name='barrier-stale-snapshot' AND wait_event='PgSleep'")!='1':
  assert time.monotonic()<deadline;time.sleep(.03)
 freeze()
 assert 'could not serialize' in stale.result()
assert run('SELECT value FROM barrier_probe WHERE id=1')=='before-freeze'
freeze(False)
# A failed attempt to acquire the barrier cannot claim maintenance succeeded.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 writer=pool.submit(client,"BEGIN; SET application_name='barrier-timeout-writer'; UPDATE barrier_probe SET value='pre-timeout' WHERE id=1; SELECT pg_sleep(1.0); COMMIT;")
 deadline=time.monotonic()+5
 while run("SELECT count(*) FROM pg_stat_activity WHERE application_name='barrier-timeout-writer' AND wait_event='PgSleep'")!='1':
  assert time.monotonic()<deadline;time.sleep(.03)
 assert 'lock timeout' in run("BEGIN; SET LOCAL lock_timeout='150ms'; SELECT budget_ops.set_write_freeze(true,'timeout proof'); COMMIT;",False)
 writer.result()
assert run('SELECT frozen FROM budget_ops.write_control')=='f'
client("UPDATE barrier_probe SET value='reopened' WHERE id=1")
assert run('SELECT value FROM barrier_probe WHERE id=1')=='reopened'
print('PASS: old repeatable-read snapshots cannot bypass freeze; lock timeout leaves the state open; reopening restores ordinary writes')
