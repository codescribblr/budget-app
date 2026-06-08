-- Migration: 108_add_loans_linked_asset.sql
-- Description: Link loans to non-cash assets for retirement forecast (e.g. mortgage on home).
-- When the asset is liquidated in a timeline event, the loan is paid off from proceeds and the
-- loan payment is removed from expenses.

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS linked_non_cash_asset_id BIGINT NULL REFERENCES non_cash_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loans_linked_asset ON loans(linked_non_cash_asset_id) WHERE linked_non_cash_asset_id IS NOT NULL;

COMMENT ON COLUMN loans.linked_non_cash_asset_id IS 'Optional link to non-cash asset (e.g. mortgage on home). When this asset is liquidated in the retirement forecast, the loan is paid off from liquidation proceeds and the loan payment is removed from expenses.';
