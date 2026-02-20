-- Migration: 105_add_target_account_to_templates.sql
-- Description: Add target_account_id and target_credit_card_id to csv_import_templates
--              to enable account-specific template lookup (same format, different account types)
-- Date: 2025-02-20

BEGIN;

-- Add target account binding columns (nullable for format-only templates)
ALTER TABLE csv_import_templates
  ADD COLUMN IF NOT EXISTS target_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL;

-- At most one of target_account_id or target_credit_card_id should be set
ALTER TABLE csv_import_templates
  DROP CONSTRAINT IF EXISTS chk_template_target_exclusive;
ALTER TABLE csv_import_templates
  ADD CONSTRAINT chk_template_target_exclusive 
  CHECK (target_account_id IS NULL OR target_credit_card_id IS NULL);

-- Drop old unique constraint if it exists (user_id, fingerprint)
ALTER TABLE csv_import_templates
  DROP CONSTRAINT IF EXISTS csv_import_templates_user_id_fingerprint_key;

-- New unique: one template per (budget account, fingerprint, target) combination
-- PostgreSQL treats NULL as distinct in unique indexes, so (acc, fp, null, null) is one row
CREATE UNIQUE INDEX IF NOT EXISTS idx_csv_import_templates_lookup 
  ON csv_import_templates(account_id, fingerprint, target_account_id, target_credit_card_id);

-- Index for efficient lookups by target
CREATE INDEX IF NOT EXISTS idx_csv_import_templates_target_account ON csv_import_templates(target_account_id) WHERE target_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csv_import_templates_target_credit_card ON csv_import_templates(target_credit_card_id) WHERE target_credit_card_id IS NOT NULL;

COMMENT ON COLUMN csv_import_templates.target_account_id IS 'Bank account (checking/savings) this template is bound to. NULL = format-only template.';
COMMENT ON COLUMN csv_import_templates.target_credit_card_id IS 'Credit card this template is bound to. NULL = format-only template.';

COMMIT;
