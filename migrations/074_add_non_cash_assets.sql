-- Migration: 074_add_non_cash_assets.sql
-- Description: Add non-cash assets table for tracking investments, real estate, vehicles, etc.
-- Date: 2025-01-XX

BEGIN;

-- Create non_cash_assets table
CREATE TABLE IF NOT EXISTS non_cash_assets (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK(asset_type IN (
    'investment',
    'real_estate',
    'vehicle',
    'art',
    'insurance',
    'collectibles',
    'cryptocurrency',
    'other'
  )),
  current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  estimated_return_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- For forecasting (e.g., 7.5 for 7.5%)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_non_cash_assets_account_id ON non_cash_assets(account_id);
CREATE INDEX IF NOT EXISTS idx_non_cash_assets_asset_type ON non_cash_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_non_cash_assets_sort_order ON non_cash_assets(sort_order);

-- Enable Row Level Security
ALTER TABLE non_cash_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view assets for accounts they belong to
CREATE POLICY "Users can view non-cash assets for their accounts"
  ON non_cash_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users
      WHERE account_users.account_id = non_cash_assets.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.status = 'active'
    )
  );

-- Users with editor role can insert assets
CREATE POLICY "Editors can insert non-cash assets"
  ON non_cash_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users
      WHERE account_users.account_id = non_cash_assets.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.status = 'active'
        AND account_users.role IN ('owner', 'editor')
    )
  );

-- Users with editor role can update assets
CREATE POLICY "Editors can update non-cash assets"
  ON non_cash_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM account_users
      WHERE account_users.account_id = non_cash_assets.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.status = 'active'
        AND account_users.role IN ('owner', 'editor')
    )
  );

-- Users with editor role can delete assets
CREATE POLICY "Editors can delete non-cash assets"
  ON non_cash_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM account_users
      WHERE account_users.account_id = non_cash_assets.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.status = 'active'
        AND account_users.role IN ('owner', 'editor')
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_non_cash_assets_updated_at ON non_cash_assets;
CREATE TRIGGER update_non_cash_assets_updated_at
  BEFORE UPDATE ON non_cash_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
