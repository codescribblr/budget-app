-- Migration: 026_fix_rls_with_security_definer.sql
-- Description: Fix RLS circular dependency using SECURITY DEFINER function
-- Date: 2025-01-15

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view accounts they belong to" ON budget_accounts;
DROP POLICY IF EXISTS "Users can view accounts via membership" ON budget_accounts;

-- Create a SECURITY DEFINER function to check account_users without triggering RLS recursion
CREATE OR REPLACE FUNCTION user_is_account_member(account_id_param BIGINT, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_users
    WHERE account_users.account_id = account_id_param
    AND account_users.user_id = user_id_param
    AND account_users.status = 'active'
  );
$$;

-- Recreate budget_accounts policies using the function
-- Policy 1: Users can see accounts they own
CREATE POLICY "Users can view accounts they belong to"
  ON budget_accounts FOR SELECT
  USING (
    owner_id = auth.uid()
  );

-- Policy 2: Users can see accounts where they are members (using SECURITY DEFINER function)
CREATE POLICY "Users can view accounts via membership"
  ON budget_accounts FOR SELECT
  USING (
    user_is_account_member(id, auth.uid())
  );


