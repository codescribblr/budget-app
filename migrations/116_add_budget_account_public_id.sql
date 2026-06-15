-- Migration: 116_add_budget_account_public_id.sql
-- Description: Add opaque public_id for user-facing budget account references
-- Date: 2026-06-15

BEGIN;

ALTER TABLE budget_accounts
  ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_accounts_public_id
  ON budget_accounts(public_id);

COMMENT ON COLUMN budget_accounts.public_id IS
  'Opaque public identifier for support and scripts. Internal APIs continue to use id.';

COMMIT;
