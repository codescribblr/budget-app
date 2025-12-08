-- Migration: 049_add_insight_feedback.sql
-- Description: Add feedback fields to ai_insights_cache table and add dashboard_insights to feature_type constraint
-- Date: 2025-01-XX

BEGIN;

-- Add feedback fields to ai_insights_cache
ALTER TABLE ai_insights_cache
ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('positive', 'negative')),
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMP WITH TIME ZONE;

-- Create index for feedback queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_feedback ON ai_insights_cache(feedback) WHERE feedback IS NOT NULL;

COMMENT ON COLUMN ai_insights_cache.feedback IS 'User feedback on the insight: positive (thumbs up) or negative (thumbs down)';
COMMENT ON COLUMN ai_insights_cache.feedback_at IS 'Timestamp when feedback was provided';

-- Add 'dashboard_insights' to the feature_type constraint in ai_usage_tracking
ALTER TABLE ai_usage_tracking
DROP CONSTRAINT IF EXISTS ai_usage_tracking_feature_type_check;

ALTER TABLE ai_usage_tracking
ADD CONSTRAINT ai_usage_tracking_feature_type_check 
CHECK (feature_type IN ('chat', 'categorization', 'insights', 'dashboard_insights', 'reports', 'prediction'));

COMMIT;
