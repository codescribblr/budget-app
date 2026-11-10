-- psql -X -v ON_ERROR_STOP=1 -v frozen=true -v reason='Approved cutover window' -f ...
-- Set frozen=false only after the old runtime has been fenced and probes pass.
-- A timeout/error means the freeze is NOT established. Never proceed on failure.
BEGIN;
SET LOCAL lock_timeout = '20s';
SET LOCAL statement_timeout = '25s';
SELECT budget_ops.set_write_freeze(:'frozen'::boolean, :'reason');
COMMIT;
SELECT frozen,changed_at,reason FROM budget_ops.write_control;
