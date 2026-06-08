-- Migration: 084_add_merchant_recommendations.sql
-- Description: Add merchant recommendations table for user recommendations
-- Date: 2026-01-31

BEGIN;

-- Create merchant_recommendations table
CREATE TABLE IF NOT EXISTS merchant_recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  pattern VARCHAR(500) NOT NULL,
  suggested_merchant_name VARCHAR(255) NOT NULL,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'merged')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  original_merchant_group_id INTEGER, -- Reference to original user group (for migration tracking)
  pattern_count INTEGER DEFAULT 1, -- Number of patterns in original group (for admin context)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create merchant_recommendation_patterns table to store all patterns from original user groups
CREATE TABLE IF NOT EXISTS merchant_recommendation_patterns (
  recommendation_id BIGINT NOT NULL REFERENCES merchant_recommendations(id) ON DELETE CASCADE,
  pattern VARCHAR(500) NOT NULL,
  PRIMARY KEY (recommendation_id, pattern)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchant_recommendations_status ON merchant_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_merchant_recommendations_user_id ON merchant_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_recommendations_account_id ON merchant_recommendations(account_id);
CREATE INDEX IF NOT EXISTS idx_merchant_recommendation_patterns_recommendation_id ON merchant_recommendation_patterns(recommendation_id);

-- Enable Row Level Security
ALTER TABLE merchant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_recommendation_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_recommendations
CREATE POLICY "Users can view their own recommendations"
  ON merchant_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create recommendations"
  ON merchant_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all recommendations"
  ON merchant_recommendations FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Admins can update recommendations"
  ON merchant_recommendations FOR UPDATE
  USING (is_current_user_admin());

-- RLS Policies for merchant_recommendation_patterns
CREATE POLICY "Users can view patterns for their recommendations"
  ON merchant_recommendation_patterns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_recommendations
      WHERE merchant_recommendations.id = merchant_recommendation_patterns.recommendation_id
      AND merchant_recommendations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert patterns for their recommendations"
  ON merchant_recommendation_patterns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchant_recommendations
      WHERE merchant_recommendations.id = merchant_recommendation_patterns.recommendation_id
      AND merchant_recommendations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all recommendation patterns"
  ON merchant_recommendation_patterns FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert recommendation patterns"
  ON merchant_recommendation_patterns FOR INSERT
  WITH CHECK (is_current_user_admin());

-- Add updated_at trigger
CREATE TRIGGER update_merchant_recommendations_updated_at
  BEFORE UPDATE ON merchant_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
