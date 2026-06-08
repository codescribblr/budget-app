-- Migration: 076_add_net_worth_snapshot_job.sql
-- Description: Add scheduled job for daily net worth snapshots
-- This job runs daily to create snapshots even if no balances change
-- Handles both old schema (job_name) and new schema (job_type)
-- Date: 2025-01-XX

BEGIN;

-- Add net worth snapshot scheduled job
-- Handles both old and new schema since this runs before migration 077
DO $$
DECLARE
  next_daily_run TIMESTAMPTZ;
  has_job_type BOOLEAN;
  has_job_name BOOLEAN;
BEGIN
  -- Calculate next daily run (tomorrow at 8 AM UTC)
  next_daily_run := DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '8 hours';
  
  -- Check which schema we're using
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_jobs' AND column_name = 'job_type'
  ) INTO has_job_type;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_jobs' AND column_name = 'job_name'
  ) INTO has_job_name;
  
  -- Insert job based on schema version
  IF has_job_type THEN
    -- New schema (migration 062+)
    INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
    SELECT 'net_worth_snapshot', 'pending', next_daily_run, '{"schedule": "0 8 * * *"}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM scheduled_jobs WHERE job_type = 'net_worth_snapshot' AND status = 'pending'
    );
  ELSIF has_job_name THEN
    -- Old schema (migration 018)
    INSERT INTO scheduled_jobs (job_name, next_run_at, last_run_status)
    SELECT 'net_worth_snapshot', next_daily_run, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM scheduled_jobs WHERE job_name = 'net_worth_snapshot'
    );
  END IF;
END $$;

COMMIT;
