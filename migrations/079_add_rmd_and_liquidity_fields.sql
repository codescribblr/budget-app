-- Migration: 079_add_rmd_and_liquidity_fields.sql
-- Description: Add is_rmd_qualified and is_liquid fields to non_cash_assets for distribution planning
-- Date: 2025-01-29

BEGIN;

-- Add is_rmd_qualified field (for IRA/401K type accounts that require RMDs)
ALTER TABLE non_cash_assets
ADD COLUMN IF NOT EXISTS is_rmd_qualified BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_liquid field (for assets that can be easily converted to cash)
ALTER TABLE non_cash_assets
ADD COLUMN IF NOT EXISTS is_liquid BOOLEAN NOT NULL DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN non_cash_assets.is_rmd_qualified IS 'Whether this asset is subject to Required Minimum Distributions (RMDs) at age 73+. Examples: Traditional IRA, 401(k), 403(b), SEP IRA, SIMPLE IRA.';
COMMENT ON COLUMN non_cash_assets.is_liquid IS 'Whether this asset can be easily converted to cash for distributions. Liquid assets (stocks, bonds, cash accounts) can be distributed immediately. Illiquid assets (real estate, collectibles) may take time to sell.';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_non_cash_assets_is_rmd_qualified ON non_cash_assets(is_rmd_qualified);
CREATE INDEX IF NOT EXISTS idx_non_cash_assets_is_liquid ON non_cash_assets(is_liquid);

COMMIT;
