-- Migration: 110_seed_suggest_merchant_groupings_job.sql
-- Description: Seed first weekly job for AI merchant suggestions (Monday 08:00 UTC)
-- Date: 2026-03-02

BEGIN;

-- Schedule first run for next Monday 08:00 UTC. If no row exists for this job_type, insert one.
-- ISODOW: 1=Monday .. 7=Sunday. Days until next Monday: (8 - isodow) % 7, or 7 if that is 0.
INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
SELECT
  'suggest_merchant_groupings',
  'pending',
  (
    (CURRENT_DATE AT TIME ZONE 'UTC')
    + (CASE WHEN (8 - EXTRACT(ISODOW FROM CURRENT_DATE)::int) % 7 = 0 THEN 7 ELSE (8 - EXTRACT(ISODOW FROM CURRENT_DATE)::int) % 7 END) * INTERVAL '1 day'
    + INTERVAL '8 hours'
  )::timestamptz,
  '{"schedule": "0 8 * * 1"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM scheduled_jobs WHERE job_type = 'suggest_merchant_groupings'
);

COMMIT;
