-- Migration: 104_add_get_user_last_activity_function.sql
-- Description: Add function to compute last app activity per user (for admin users list)
-- Last activity = latest of: settings updates, transactions, categories, budget_accounts for that user
-- Date: 2025-02-12

BEGIN;

CREATE OR REPLACE FUNCTION get_user_last_activity(user_ids UUID[])
RETURNS TABLE(user_id UUID, last_activity TIMESTAMPTZ) AS $$
  WITH user_accounts AS (
    SELECT ba.id AS account_id, ba.owner_id AS user_id
    FROM budget_accounts ba
    WHERE ba.owner_id = ANY(user_ids) AND (ba.deleted_at IS NULL)
    UNION
    SELECT au.account_id, au.user_id
    FROM account_users au
    WHERE au.user_id = ANY(user_ids) AND au.status = 'active'
  )
  SELECT
    uid AS user_id,
    NULLIF(GREATEST(
      COALESCE((SELECT MAX(s.updated_at) FROM settings s WHERE s.user_id = uid), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(t.updated_at) FROM transactions t JOIN user_accounts ua ON ua.account_id = t.budget_account_id AND ua.user_id = uid), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(c.updated_at) FROM categories c JOIN user_accounts ua ON ua.account_id = c.account_id AND ua.user_id = uid), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(ba.updated_at) FROM budget_accounts ba WHERE ba.owner_id = uid AND ba.deleted_at IS NULL), '1970-01-01'::timestamptz)
    ), '1970-01-01'::timestamptz) AS last_activity
  FROM unnest(user_ids) AS uid;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_user_last_activity(UUID[]) IS 'Returns the latest activity timestamp per user from settings, transactions, categories, and budget_accounts for admin reporting';

COMMIT;
