-- Migration: 032_add_account_id_to_user_feature_flags.sql
-- Description: Add account_id to user_feature_flags table for multi-user collaboration
-- Date: 2025-01-16

-- Add account_id column to user_feature_flags
ALTER TABLE user_feature_flags
ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;

-- Migrate existing feature flags to use account_id
-- Each user's feature flags get linked to their primary account (owned account)
UPDATE user_feature_flags uff
SET account_id = (
  SELECT ba.id
  FROM budget_accounts ba
  WHERE ba.owner_id = uff.user_id
  AND ba.deleted_at IS NULL
  ORDER BY ba.created_at ASC
  LIMIT 1
)
WHERE uff.account_id IS NULL;

-- Make account_id NOT NULL after migration
ALTER TABLE user_feature_flags
ALTER COLUMN account_id SET NOT NULL;

-- Drop the old unique constraint on user_id, feature_name
ALTER TABLE user_feature_flags
DROP CONSTRAINT IF EXISTS user_feature_flags_user_id_feature_name_key;

-- Add unique constraint on account_id, feature_name (one flag per feature per account)
ALTER TABLE user_feature_flags
ADD CONSTRAINT user_feature_flags_account_id_feature_name_key UNIQUE (account_id, feature_name);

-- Create index on account_id
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_account_id ON user_feature_flags(account_id);

-- Update RLS policies to use account-based access
DROP POLICY IF EXISTS "Users can view their own feature flags" ON user_feature_flags;
DROP POLICY IF EXISTS "Users can insert their own feature flags" ON user_feature_flags;
DROP POLICY IF EXISTS "Users can update their own feature flags" ON user_feature_flags;
DROP POLICY IF EXISTS "Users can delete their own feature flags" ON user_feature_flags;

-- Users can view feature flags for accounts they belong to
CREATE POLICY "Users can view account feature flags"
  ON user_feature_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = user_feature_flags.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

-- Only account owners and editors can insert feature flags
CREATE POLICY "Account owners and editors can insert feature flags"
  ON user_feature_flags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = user_feature_flags.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

-- Only account owners and editors can update feature flags
CREATE POLICY "Account owners and editors can update feature flags"
  ON user_feature_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = user_feature_flags.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = user_feature_flags.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

-- Only account owners and editors can delete feature flags
CREATE POLICY "Account owners and editors can delete feature flags"
  ON user_feature_flags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = user_feature_flags.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );







