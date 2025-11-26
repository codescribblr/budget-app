-- Migration: 023_fix_missing_user_accounts.sql
-- Description: Ensure all existing users have budget accounts created and are set as owners
-- Date: 2025-01-15

-- =====================================================
-- STEP 1: Create budget_accounts for any users that don't have one
-- =====================================================

-- Insert budget_accounts for users who don't have one
INSERT INTO budget_accounts (owner_id, name, created_at, updated_at)
SELECT 
  u.id as owner_id,
  COALESCE(u.email, 'My Budget') as name,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM budget_accounts ba
  WHERE ba.owner_id = u.id
  AND ba.deleted_at IS NULL
);

-- =====================================================
-- STEP 2: Ensure all budget_accounts have account_users entries for owners
-- =====================================================

-- Insert account_users entries for owners who don't have one
INSERT INTO account_users (account_id, user_id, role, status, accepted_at, created_at, updated_at)
SELECT 
  ba.id as account_id,
  ba.owner_id as user_id,
  'owner' as role,
  'active' as status,
  NOW() as accepted_at,
  NOW() as created_at,
  NOW() as updated_at
FROM budget_accounts ba
WHERE ba.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM account_users au
  WHERE au.account_id = ba.id
  AND au.user_id = ba.owner_id
  AND au.status = 'active'
)
ON CONFLICT (account_id, user_id) DO UPDATE
SET 
  role = 'owner',
  status = 'active',
  accepted_at = COALESCE(account_users.accepted_at, NOW()),
  updated_at = NOW();

-- =====================================================
-- STEP 3: Verify the fix
-- =====================================================

-- This query should return 0 rows if everything is correct
-- (all users should have budget_accounts)
SELECT 
  u.id,
  u.email,
  'Missing budget_account' as issue
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM budget_accounts ba
  WHERE ba.owner_id = u.id
  AND ba.deleted_at IS NULL
)
UNION ALL
-- This query should also return 0 rows
-- (all budget_accounts should have account_users entries for owners)
SELECT 
  ba.owner_id as id,
  (SELECT email FROM auth.users WHERE id = ba.owner_id) as email,
  'Missing account_users entry' as issue
FROM budget_accounts ba
WHERE ba.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM account_users au
  WHERE au.account_id = ba.id
  AND au.user_id = ba.owner_id
  AND au.status = 'active'
);


