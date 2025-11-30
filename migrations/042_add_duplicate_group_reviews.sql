-- Migration: 042_add_duplicate_group_reviews.sql
-- Description: Add table to track reviewed duplicate transaction groups
-- Date: 2025-01-XX

BEGIN;

CREATE TABLE IF NOT EXISTS duplicate_group_reviews (
  id BIGSERIAL PRIMARY KEY,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  transaction_ids BIGINT[] NOT NULL,
  group_fingerprint TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(budget_account_id, transaction_ids)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_group_reviews_account 
  ON duplicate_group_reviews(budget_account_id);

CREATE INDEX IF NOT EXISTS idx_duplicate_group_reviews_transaction_ids 
  ON duplicate_group_reviews USING GIN(transaction_ids);

CREATE INDEX IF NOT EXISTS idx_duplicate_group_reviews_fingerprint 
  ON duplicate_group_reviews(budget_account_id, group_fingerprint);

COMMENT ON TABLE duplicate_group_reviews IS 
  'Tracks duplicate transaction groups that have been reviewed and marked as "not duplicates"';
COMMENT ON COLUMN duplicate_group_reviews.transaction_ids IS 
  'Array of transaction IDs that were reviewed together. Used to prevent re-showing the same group.';
COMMENT ON COLUMN duplicate_group_reviews.group_fingerprint IS 
  'Content-based hash (amount+date+description) for identifying reviewed groups even if transactions are deleted.';

COMMIT;

