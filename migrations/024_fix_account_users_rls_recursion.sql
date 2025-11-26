-- Migration: 024_fix_account_users_rls_recursion.sql
-- Description: Fix infinite recursion in account_users RLS policy
-- Date: 2025-01-15

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their account memberships" ON account_users;

-- Recreate the policy without recursion
-- Users can view their own memberships directly
-- Owners can view members of accounts they own (checked via budget_accounts only, no account_users recursion)
CREATE POLICY "Users can view their account memberships"
  ON account_users FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
  );

