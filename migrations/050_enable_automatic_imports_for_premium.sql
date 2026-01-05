-- Migration: 050_enable_automatic_imports_for_premium.sql
-- Description: Enable automatic_imports feature for all existing premium accounts
-- Date: 2025-01-XX

BEGIN;

-- Enable automatic_imports feature for all accounts that have premium subscriptions
-- This ensures existing premium users get access to the new feature automatically
INSERT INTO user_feature_flags (account_id, user_id, feature_name, enabled, enabled_at, disabled_at, updated_at)
SELECT DISTINCT
  us.account_id,
  us.user_id,
  'automatic_imports'::text,
  true,
  NOW(),
  NULL::timestamp with time zone,
  NOW()
FROM user_subscriptions us
WHERE us.tier = 'premium'
  AND us.status IN ('active', 'trialing')
  AND us.account_id IS NOT NULL
  -- Only insert if the feature flag doesn't already exist for this account
  AND NOT EXISTS (
    SELECT 1
    FROM user_feature_flags uff
    WHERE uff.account_id = us.account_id
      AND uff.feature_name = 'automatic_imports'
  )
ON CONFLICT (account_id, feature_name) DO NOTHING;

COMMENT ON COLUMN user_feature_flags.feature_name IS 'Feature name - now includes automatic_imports';

COMMIT;

