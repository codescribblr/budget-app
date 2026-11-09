BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Collaboration added account_id, but these legacy keys still prevented one
-- user from restoring the same merchant names/patterns into another budget.
-- Retain the existing per-user semantics inside each budget; do not merge or
-- delete groups created by different collaborators.
CREATE UNIQUE INDEX IF NOT EXISTS merchant_groups_account_user_name_key
  ON public.merchant_groups (account_id, user_id, display_name);
CREATE UNIQUE INDEX IF NOT EXISTS merchant_mappings_account_user_pattern_key
  ON public.merchant_mappings (account_id, user_id, pattern);

-- Preserve the old protection for any rows not yet assigned to a budget.
CREATE UNIQUE INDEX IF NOT EXISTS merchant_groups_legacy_user_name_key
  ON public.merchant_groups (user_id, display_name) WHERE account_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS merchant_mappings_legacy_user_pattern_key
  ON public.merchant_mappings (user_id, pattern) WHERE account_id IS NULL;

ALTER TABLE public.merchant_groups
  DROP CONSTRAINT IF EXISTS merchant_groups_user_id_display_name_key;
ALTER TABLE public.merchant_mappings
  DROP CONSTRAINT IF EXISTS merchant_mappings_user_id_pattern_key;

COMMIT;
