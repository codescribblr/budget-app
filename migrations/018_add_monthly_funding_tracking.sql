-- Migration: 018_add_monthly_funding_tracking.sql
-- Description: Add monthly funding tracking and feature flags system (Phase 1)
-- Date: 2025-11-22

-- ============================================================================
-- CATEGORY MONTHLY FUNDING TABLE
-- ============================================================================
-- Tracks how much has been funded to each category each month
-- Enables tracking "funded this month" separately from "current balance"
CREATE TABLE IF NOT EXISTS category_monthly_funding (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month (e.g., '2025-11-01')
  target_amount DECIMAL(10,2), -- Target funding for this month
  funded_amount DECIMAL(10,2) DEFAULT 0, -- How much has been funded this month
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_monthly_funding_user_month 
  ON category_monthly_funding(user_id, month);
CREATE INDEX IF NOT EXISTS idx_category_monthly_funding_category 
  ON category_monthly_funding(category_id);
CREATE INDEX IF NOT EXISTS idx_category_monthly_funding_user_category 
  ON category_monthly_funding(user_id, category_id);

-- Enable Row Level Security
ALTER TABLE category_monthly_funding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own monthly funding"
  ON category_monthly_funding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly funding"
  ON category_monthly_funding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly funding"
  ON category_monthly_funding FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly funding"
  ON category_monthly_funding FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER FEATURE FLAGS TABLE
-- ============================================================================
-- Tracks which features each user has enabled
-- Enables progressive disclosure of complex features
CREATE TABLE IF NOT EXISTS user_feature_flags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_user 
  ON user_feature_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_user_feature 
  ON user_feature_flags(user_id, feature_name);

-- Enable Row Level Security
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feature flags"
  ON user_feature_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature flags"
  ON user_feature_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature flags"
  ON user_feature_flags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feature flags"
  ON user_feature_flags FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SCHEDULED JOBS TABLE
-- ============================================================================
-- Tracks execution status of scheduled jobs (cron jobs)
-- Enables monitoring and alerting for background tasks
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL UNIQUE,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20), -- 'success', 'failed', 'running'
  last_run_duration_ms INTEGER,
  last_error TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_name ON scheduled_jobs(job_name);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(last_run_status);

-- Enable Row Level Security (admin-only access)
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for all authenticated users, write for service role only)
CREATE POLICY "Authenticated users can view scheduled jobs"
  ON scheduled_jobs FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- SETTINGS TABLE UPDATES
-- ============================================================================
-- Add new columns to settings table for variable income features
ALTER TABLE settings ADD COLUMN IF NOT EXISTS income_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_fund_from_buffer BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_onboarding BOOLEAN DEFAULT true;

-- Add check constraint for income_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_income_type'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT check_income_type 
      CHECK (income_type IN ('regular', 'variable'));
  END IF;
END $$;

