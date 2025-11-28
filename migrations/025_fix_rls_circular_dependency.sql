-- Migration: 025_fix_rls_circular_dependency.sql
-- Description: Fix circular dependency between budget_accounts and account_users RLS policies
-- Date: 2025-01-15

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view accounts they belong to" ON budget_accounts;
DROP POLICY IF EXISTS "Users can view their account memberships" ON account_users;

-- Recreate budget_accounts policy WITHOUT checking account_users
-- This breaks the circular dependency
-- Users can see accounts they own directly
CREATE POLICY "Users can view accounts they belong to"
  ON budget_accounts FOR SELECT
  USING (
    owner_id = auth.uid()
  );

-- Recreate account_users policy WITHOUT checking budget_accounts for the user's own rows
-- Users can see their own memberships directly (no need to check budget_accounts)
-- Owners can see members of accounts they own (check budget_accounts, but only for owner check)
CREATE POLICY "Users can view their account memberships"
  ON account_users FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
      -- Only check owner_id, don't check account_users again
    )
  );

-- Now add a separate policy to allow users to see accounts where they are members
-- This uses account_users which users can already see (their own rows)
CREATE POLICY "Users can view accounts via membership"
  ON budget_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = budget_accounts.id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      -- This is safe because users can see their own account_users rows
      -- without triggering budget_accounts check
    )
  );



