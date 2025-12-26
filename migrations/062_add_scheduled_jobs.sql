-- Migration: 062_add_scheduled_jobs.sql
-- Description: Add scheduled_jobs table for managing cron jobs
-- Date: 2025-01-XX

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure we don't have duplicate pending jobs of the same type
  UNIQUE(job_type, status, scheduled_for) WHERE status = 'pending'
);

-- Create index for efficient querying of pending jobs
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_scheduled ON scheduled_jobs(status, scheduled_for) WHERE status = 'pending';

-- Create index for job_type lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type ON scheduled_jobs(job_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_jobs_updated_at();

-- Add RLS policies
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role can manage scheduled jobs"
  ON scheduled_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read their own job results (if needed)
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

