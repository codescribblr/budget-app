-- Migration: 041_add_ai_tables.sql
-- Description: Add AI integration tables for usage tracking, categorization history, insights cache, and user preferences
-- Date: 2025-11-28

BEGIN;

-- AI Usage Tracking
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('chat', 'categorization', 'insights', 'reports', 'prediction')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_tokens CHECK (tokens_used >= 0)
);

-- Indexes for AI Usage Tracking
-- Note: Indexing on timestamp directly (DATE() function is not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_timestamp ON ai_usage_tracking(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_account_timestamp ON ai_usage_tracking(account_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_tracking(feature_type, timestamp);

-- AI Categorization History
CREATE TABLE IF NOT EXISTS ai_categorization_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_category_id INTEGER REFERENCES categories(id),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  user_accepted BOOLEAN DEFAULT NULL, -- NULL = pending, TRUE = accepted, FALSE = rejected
  user_chosen_category_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  feedback_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT different_categories CHECK (
    user_chosen_category_id IS NULL OR 
    suggested_category_id IS NULL OR
    suggested_category_id != user_chosen_category_id
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_cat_transaction ON ai_categorization_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ai_cat_user ON ai_categorization_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_cat_feedback ON ai_categorization_history(user_accepted) WHERE user_accepted IS NOT NULL;

-- AI Insights Cache
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual', 'custom'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  insights JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  view_count INTEGER DEFAULT 0,
  
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights_cache(user_id, period_start, insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expiry ON ai_insights_cache(expires_at);

-- User AI Preferences
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  auto_categorize BOOLEAN DEFAULT TRUE,
  auto_insights BOOLEAN DEFAULT TRUE,
  chat_history_enabled BOOLEAN DEFAULT TRUE,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_categorization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own AI usage
DROP POLICY IF EXISTS ai_usage_user_select ON ai_usage_tracking;
CREATE POLICY ai_usage_user_select ON ai_usage_tracking
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own AI usage (must match their user_id and have access to account_id)
DROP POLICY IF EXISTS ai_usage_user_insert ON ai_usage_tracking;
CREATE POLICY ai_usage_user_insert ON ai_usage_tracking
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_account_access(account_id)
  );

-- Users can view their own categorization history
DROP POLICY IF EXISTS ai_cat_user_select ON ai_categorization_history;
CREATE POLICY ai_cat_user_select ON ai_categorization_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update categorization feedback
DROP POLICY IF EXISTS ai_cat_user_update ON ai_categorization_history;
CREATE POLICY ai_cat_user_update ON ai_categorization_history
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can insert categorization history
DROP POLICY IF EXISTS ai_cat_user_insert ON ai_categorization_history;
CREATE POLICY ai_cat_user_insert ON ai_categorization_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can view their own insights
DROP POLICY IF EXISTS ai_insights_user_select ON ai_insights_cache;
CREATE POLICY ai_insights_user_select ON ai_insights_cache
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own insights
DROP POLICY IF EXISTS ai_insights_user_insert ON ai_insights_cache;
CREATE POLICY ai_insights_user_insert ON ai_insights_cache
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can manage their AI preferences
DROP POLICY IF EXISTS ai_prefs_user_all ON user_ai_preferences;
CREATE POLICY ai_prefs_user_all ON user_ai_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_insights_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;


