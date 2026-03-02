-- Migration: 109_add_global_merchant_suggestions.sql
-- Description: Add AI merchant suggestion tables for admin review queue
-- Date: 2026-03-02

BEGIN;

-- 1. global_merchant_suggestions
CREATE TABLE IF NOT EXISTS global_merchant_suggestions (
  id BIGSERIAL PRIMARY KEY,
  suggested_global_merchant_id BIGINT REFERENCES global_merchants(id) ON DELETE SET NULL,
  suggested_display_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  batch_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_global_merchant_suggestions_status ON global_merchant_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_global_merchant_suggestions_batch_id ON global_merchant_suggestions(batch_id);
CREATE INDEX IF NOT EXISTS idx_global_merchant_suggestions_created_at ON global_merchant_suggestions(created_at DESC);

ALTER TABLE global_merchant_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view global merchant suggestions"
  ON global_merchant_suggestions FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Admins can update global merchant suggestions"
  ON global_merchant_suggestions FOR UPDATE
  USING (is_current_user_admin());

-- INSERT: only service role (cron/job) inserts; no policy for authenticated = only service role can insert

-- 2. global_merchant_suggestion_patterns
CREATE TABLE IF NOT EXISTS global_merchant_suggestion_patterns (
  suggestion_id BIGINT NOT NULL REFERENCES global_merchant_suggestions(id) ON DELETE CASCADE,
  pattern_id BIGINT NOT NULL REFERENCES global_merchant_patterns(id) ON DELETE CASCADE,
  PRIMARY KEY (suggestion_id, pattern_id)
);

CREATE INDEX IF NOT EXISTS idx_global_merchant_suggestion_patterns_suggestion_id ON global_merchant_suggestion_patterns(suggestion_id);

ALTER TABLE global_merchant_suggestion_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suggestion patterns"
  ON global_merchant_suggestion_patterns FOR SELECT
  USING (is_current_user_admin());

-- INSERT: only service role

-- 3. global_merchant_pattern_rejections
CREATE TABLE IF NOT EXISTS global_merchant_pattern_rejections (
  id BIGSERIAL PRIMARY KEY,
  pattern_id BIGINT NOT NULL REFERENCES global_merchant_patterns(id) ON DELETE CASCADE,
  rejected_global_merchant_id BIGINT REFERENCES global_merchants(id) ON DELETE CASCADE,
  rejected_suggested_display_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rejection_target CHECK (
    (rejected_global_merchant_id IS NOT NULL) OR (rejected_suggested_display_name IS NOT NULL AND rejected_suggested_display_name != '')
  )
);

CREATE INDEX IF NOT EXISTS idx_global_merchant_pattern_rejections_pattern_id ON global_merchant_pattern_rejections(pattern_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_merchant_pattern_rejections_unique
  ON global_merchant_pattern_rejections (pattern_id, COALESCE(rejected_global_merchant_id::text, ''), COALESCE(rejected_suggested_display_name, ''));

ALTER TABLE global_merchant_pattern_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pattern rejections"
  ON global_merchant_pattern_rejections FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert pattern rejections"
  ON global_merchant_pattern_rejections FOR INSERT
  WITH CHECK (is_current_user_admin());

COMMIT;
