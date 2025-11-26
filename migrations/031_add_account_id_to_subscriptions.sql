-- Migration: 031_add_account_id_to_subscriptions.sql
-- Description: Add account_id to user_subscriptions table for multi-user collaboration
-- Date: 2025-01-16

-- Add account_id column to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;

-- Migrate existing subscriptions to use account_id
-- Each user gets their subscription linked to their primary account (owned account)
UPDATE user_subscriptions us
SET account_id = (
  SELECT ba.id
  FROM budget_accounts ba
  WHERE ba.owner_id = us.user_id
  AND ba.deleted_at IS NULL
  ORDER BY ba.created_at ASC
  LIMIT 1
)
WHERE us.account_id IS NULL;

-- Make account_id NOT NULL after migration
ALTER TABLE user_subscriptions
ALTER COLUMN account_id SET NOT NULL;

-- Drop the old unique constraint on user_id
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;

-- Add unique constraint on account_id (one subscription per account)
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_account_id_key UNIQUE (account_id);

-- Create index on account_id
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_account_id ON user_subscriptions(account_id);

-- Update RLS policies to use account-based access
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;

-- Users can view subscriptions for accounts they belong to
CREATE POLICY "Users can view account subscriptions"
  ON user_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = user_subscriptions.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

-- Only account owners can insert subscriptions
CREATE POLICY "Account owners can insert subscriptions"
  ON user_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_subscriptions.account_id
      AND ba.owner_id = auth.uid()
    )
  );

-- Only account owners can update subscriptions
CREATE POLICY "Account owners can update subscriptions"
  ON user_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_subscriptions.account_id
      AND ba.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_subscriptions.account_id
      AND ba.owner_id = auth.uid()
    )
  );


