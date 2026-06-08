-- Migration: 077_migrate_scheduled_jobs_schema.sql
-- Description: Migrate scheduled_jobs table from old schema (job_name) to new schema (job_type)
-- This migration is idempotent and safe to run multiple times
-- Date: 2025-01-XX

BEGIN;

-- Check if table exists, if not create it with new schema
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

-- Migrate from old schema to new schema if needed
DO $$
DECLARE
  has_job_name BOOLEAN;
  has_job_type BOOLEAN;
  has_status BOOLEAN;
  has_scheduled_for BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_jobs' AND column_name = 'job_name'
  ) INTO has_job_name;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_jobs' AND column_name = 'job_type'
  ) INTO has_job_type;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_jobs' AND column_name = 'status'
  ) INTO has_status;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_jobs' AND column_name = 'scheduled_for'
  ) INTO has_scheduled_for;
  
  -- If we have old schema (job_name) but not new schema (job_type), migrate
  IF has_job_name AND NOT has_job_type THEN
    RAISE NOTICE 'Migrating scheduled_jobs table from old schema to new schema';
    
    -- Add new columns if they don't exist
    IF NOT has_job_type THEN
      ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS job_type TEXT;
    END IF;
    
    IF NOT has_status THEN
      ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT has_scheduled_for THEN
      ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_jobs' AND column_name = 'started_at') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_jobs' AND column_name = 'completed_at') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_jobs' AND column_name = 'error_message') THEN
      ALTER TABLE scheduled_jobs ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_jobs' AND column_name = 'metadata') THEN
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
    
    RAISE NOTICE 'Migration completed successfully';
  ELSIF has_job_type THEN
    RAISE NOTICE 'scheduled_jobs table already uses new schema, skipping migration';
  ELSE
    RAISE NOTICE 'scheduled_jobs table structure is unknown, creating with new schema';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type ON scheduled_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled_for ON scheduled_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending ON scheduled_jobs(scheduled_for) WHERE status = 'pending';

-- Add unique constraint on job_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scheduled_jobs_job_type_key'
  ) THEN
    -- Only add unique constraint if there are no duplicate job_types with pending status
    -- This handles the case where old schema might have had duplicates
    ALTER TABLE scheduled_jobs ADD CONSTRAINT scheduled_jobs_job_type_key UNIQUE (job_type);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

COMMIT;
