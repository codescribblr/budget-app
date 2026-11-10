-- Operator-installed cutover control, intentionally outside automatic migrations.
-- Apply with psql ON_ERROR_STOP in a transaction after backup and schema review.
-- Covers application tables in public, not Supabase-managed Auth/Storage tables.
-- Installation preserves the current mode on reruns and never enables a freeze.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS budget_ops;
REVOKE ALL ON SCHEMA budget_ops FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS budget_ops.write_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  frozen boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL DEFAULT ''
);
ALTER TABLE budget_ops.write_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON budget_ops.write_control FROM PUBLIC, anon, authenticated, service_role;
INSERT INTO budget_ops.write_control(singleton) VALUES(true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION budget_ops.require_operator() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  -- current_user alone is unsafe inside a SECURITY DEFINER RPC/trigger.
  -- A service-role request still has session_user=authenticator, even when its
  -- function runs as postgres. SET ROLE also must not acquire the bypass.
  IF session_user <> 'postgres' OR current_setting('role') NOT IN ('none', 'postgres') THEN
    RAISE insufficient_privilege USING MESSAGE = 'Direct operator connection required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION budget_ops.check_application_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE paused boolean;
BEGIN
  IF current_setting('budget_ops.operator_bypass', true) = 'on' THEN
    PERFORM budget_ops.require_operator();
    RETURN NULL;
  END IF;
  -- Held until COMMIT/ROLLBACK. The exclusive control update must wait for all
  -- admitted writers, including transactions with multiple statements.
  -- FOR SHARE follows the updated row after waiting; repeatable-read snapshots
  -- fail with a serialization error instead of accepting stale "open" state.
  SELECT frozen INTO paused FROM budget_ops.write_control WHERE singleton FOR SHARE;
  IF NOT FOUND OR paused THEN
    RAISE SQLSTATE 'PT503' USING MESSAGE = 'Budget writes are paused for maintenance. Please try again shortly.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION budget_ops.assert_write_coverage() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE missing text;
BEGIN
  PERFORM budget_ops.require_operator();
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY c.relname) INTO missing
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid
      AND t.tgname='budget_cutover_write_barrier' AND t.tgfoid='budget_ops.check_application_write()'::regprocedure
      AND t.tgtype=62 AND t.tgenabled='A' AND t.tgqual IS NULL);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Unprotected application tables: %', missing;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION budget_ops.set_write_freeze(paused boolean, explanation text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM budget_ops.require_operator();
  IF paused IS NULL OR length(trim(coalesce(explanation,''))) < 5 THEN
    RAISE EXCEPTION 'A state and operator reason are required';
  END IF;
  PERFORM budget_ops.assert_write_coverage();
  UPDATE budget_ops.write_control SET frozen=paused, reason=explanation, changed_at=clock_timestamp() WHERE singleton;
  IF NOT FOUND THEN RAISE EXCEPTION 'Write-control state is missing'; END IF;
END;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA budget_ops FROM PUBLIC, anon, authenticated, service_role;

DO $$
DECLARE target record;
BEGIN
  FOR target IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS budget_cutover_write_barrier ON %I.%I',target.nspname,target.relname);
    EXECUTE format('CREATE TRIGGER budget_cutover_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %I.%I FOR EACH STATEMENT EXECUTE FUNCTION budget_ops.check_application_write()',target.nspname,target.relname);
    EXECUTE format('ALTER TABLE %I.%I ENABLE ALWAYS TRIGGER budget_cutover_write_barrier',target.nspname,target.relname);
  END LOOP;
END;
$$;
SELECT budget_ops.assert_write_coverage();
COMMIT;
