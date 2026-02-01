-- Migration: 082_add_trial_period_check_job.sql
-- Description: Add scheduled job for checking trial periods and sending notifications
-- Date: 2025-01-31

BEGIN;

-- Insert the check_trial_periods job (runs daily at 8 AM UTC)
-- Calculate next run time (tomorrow at 8 AM UTC)
DO $$
DECLARE
  next_daily_run TIMESTAMPTZ;
BEGIN
  -- Calculate next daily run (tomorrow at 8 AM UTC)
  next_daily_run := DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '8 hours';
  
  -- Insert job (only if no pending job of this type already exists)
  INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
  SELECT 'check_trial_periods', 'pending', next_daily_run, '{"schedule": "0 8 * * *"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_jobs WHERE job_type = 'check_trial_periods' AND status = 'pending'
  );
END $$;

COMMIT;
