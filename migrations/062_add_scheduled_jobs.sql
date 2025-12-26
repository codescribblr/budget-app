-- Migration: 062_add_scheduled_jobs.sql
-- Description: Add scheduled_jobs table for managing cron jobs
-- Date: 2025-01-XX

BEGIN;

-- Create scheduled_jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate from old schema (migration 018) to new schema if needed
-- Old schema had: job_name, last_run_at, last_run_status, etc.
-- New schema has: job_type, status, scheduled_for, etc.
DO $$
BEGIN
  -- Check if old schema exists (has job_name column)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'scheduled_jobs' AND column_name = 'job_name') THEN
    -- Old schema detected - migrate to new schema
    -- Add new columns first
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'job_type') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN job_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'status') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'scheduled_for') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN scheduled_for TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'started_at') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'completed_at') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'error_message') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'metadata') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Migrate data from old columns to new columns
    UPDATE scheduled_jobs SET
      job_type = COALESCE(job_type, job_name),
      status = COALESCE(status, 
        CASE 
          WHEN last_run_status = 'running' THEN 'running'
          WHEN last_run_status = 'failed' THEN 'failed'
          WHEN last_run_status = 'success' THEN 'completed'
          ELSE 'pending'
        END),
      scheduled_for = COALESCE(scheduled_for, next_run_at, NOW()),
      started_at = COALESCE(started_at, last_run_at),
      completed_at = CASE WHEN last_run_status IN ('success', 'failed') THEN last_run_at ELSE NULL END,
      error_message = COALESCE(error_message, last_error)
    WHERE job_name IS NOT NULL;
    
    -- Ensure all rows have values for required columns
    UPDATE scheduled_jobs SET job_type = COALESCE(job_type, 'unknown') WHERE job_type IS NULL;
    UPDATE scheduled_jobs SET status = COALESCE(status, 'pending') WHERE status IS NULL;
    UPDATE scheduled_jobs SET scheduled_for = COALESCE(scheduled_for, NOW()) WHERE scheduled_for IS NULL;
    
    -- Make new columns NOT NULL after ensuring all rows have values
    ALTER TABLE scheduled_jobs ALTER COLUMN job_type SET NOT NULL;
    ALTER TABLE scheduled_jobs ALTER COLUMN status SET NOT NULL;
    ALTER TABLE scheduled_jobs ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE scheduled_jobs ALTER COLUMN scheduled_for SET NOT NULL;
    
    -- Drop old columns (after ensuring new columns are populated)
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS job_name;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS last_run_at;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS last_run_status;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS last_run_duration_ms;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS last_error;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS next_run_at;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS run_count;
    ALTER TABLE scheduled_jobs DROP COLUMN IF EXISTS failure_count;
    
    -- Drop old indexes
    DROP INDEX IF EXISTS idx_scheduled_jobs_name;
    DROP INDEX IF EXISTS idx_scheduled_jobs_next_run;
    DROP INDEX IF EXISTS idx_scheduled_jobs_status;
  ELSE
    -- New schema - just add columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'job_type') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN job_type TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'status') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'scheduled_for') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'started_at') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'completed_at') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'error_message') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'scheduled_jobs' AND column_name = 'metadata') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- Create unique index to ensure we don't have duplicate pending jobs of the same type
-- Note: Using unique index with WHERE clause instead of table constraint
-- Only create if columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'scheduled_jobs' AND column_name = 'job_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'scheduled_jobs' AND column_name = 'status')
     AND EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'scheduled_jobs' AND column_name = 'scheduled_for') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_jobs_unique_pending 
    ON scheduled_jobs(job_type, status, scheduled_for) 
    WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_scheduled 
    ON scheduled_jobs(status, scheduled_for) 
    WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type 
    ON scheduled_jobs(job_type);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_scheduled_jobs_updated_at ON scheduled_jobs;
CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_jobs_updated_at();

-- Add RLS policies
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for cron jobs)
DROP POLICY IF EXISTS "Service role can manage scheduled jobs" ON scheduled_jobs;
CREATE POLICY "Service role can manage scheduled jobs"
  ON scheduled_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read their own job results (if needed)
DROP POLICY IF EXISTS "Users can read scheduled jobs" ON scheduled_jobs;
CREATE POLICY "Users can read scheduled jobs"
  ON scheduled_jobs
  FOR SELECT
  USING (true);

-- Insert initial scheduled jobs for existing cron jobs
-- These will be automatically rescheduled after each run
-- Calculate next run times:
-- - Daily jobs: tomorrow at 8 AM UTC
-- - Monthly job: 1st of next month at midnight UTC
DO $$
DECLARE
  next_daily_run TIMESTAMPTZ;
  next_monthly_run TIMESTAMPTZ;
BEGIN
  -- Calculate next daily run (tomorrow at 8 AM UTC)
  next_daily_run := DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '8 hours';
  
  -- Calculate next monthly run (1st of next month at midnight UTC)
  -- Note: With daily cron at 8 AM UTC, this will execute at 8 AM UTC on the 1st
  -- If cron frequency increases in the future, it will execute closer to midnight
  next_monthly_run := DATE_TRUNC('month', NOW() + INTERVAL '1 month') + INTERVAL '1 day';
  
  -- Insert jobs (only if no pending job of this type already exists)
  INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
  SELECT 'check_recurring_transactions', 'pending', next_daily_run, '{"schedule": "0 8 * * *"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_jobs WHERE job_type = 'check_recurring_transactions' AND status = 'pending'
  );
  
  INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
  SELECT 'send_notifications', 'pending', next_daily_run, '{"schedule": "0 8 * * *"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_jobs WHERE job_type = 'send_notifications' AND status = 'pending'
  );
  
  INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
  SELECT 'monthly_rollover', 'pending', next_monthly_run, '{"schedule": "0 0 1 * *"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_jobs WHERE job_type = 'monthly_rollover' AND status = 'pending'
  );
END $$;

COMMIT;

