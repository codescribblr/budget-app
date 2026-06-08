-- Migration: 113_add_rentcast_integration.sql
-- Description: Add RentCast.io integration for automated real estate valuations
-- Date: 2026-06-05

BEGIN;

-- =====================================================
-- INTEGRATION SETTINGS
-- =====================================================
-- Per-account third-party integration credentials and usage tracking

CREATE TABLE IF NOT EXISTS integration_settings (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('rentcast')),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  encrypted_api_key TEXT,
  api_key_hint TEXT,
  config JSONB NOT NULL DEFAULT '{"enforce_monthly_limit": true, "monthly_request_limit": 50}'::jsonb,
  requests_this_month INTEGER NOT NULL DEFAULT 0,
  usage_month TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integration_settings_account_id ON integration_settings(account_id);
CREATE INDEX IF NOT EXISTS idx_integration_settings_enabled
  ON integration_settings(account_id, integration_type)
  WHERE is_enabled = TRUE;

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account owners can view integration settings"
  ON integration_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = integration_settings.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Account owners can insert integration settings"
  ON integration_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = integration_settings.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Account owners can update integration settings"
  ON integration_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = integration_settings.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Account owners can delete integration settings"
  ON integration_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = integration_settings.account_id
      AND ba.owner_id = auth.uid()
    )
  );

COMMENT ON TABLE integration_settings IS 'Third-party integration credentials and configuration per budget account';

-- =====================================================
-- NON-CASH ASSETS: RENTCAST FIELDS
-- =====================================================

ALTER TABLE non_cash_assets
  ADD COLUMN IF NOT EXISTS rentcast_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IS NULL OR property_type IN (
    'Single Family', 'Condo', 'Townhouse', 'Manufactured', 'Multi-Family', 'Apartment', 'Land'
  )),
  ADD COLUMN IF NOT EXISTS bedrooms DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS bathrooms DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS square_footage INTEGER,
  ADD COLUMN IF NOT EXISTS rentcast_last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rentcast_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_non_cash_assets_rentcast_enabled
  ON non_cash_assets(account_id, rentcast_enabled)
  WHERE rentcast_enabled = TRUE AND asset_type = 'real_estate';

-- =====================================================
-- RENTCAST VALUATIONS
-- =====================================================
-- Stores valuation snapshots from RentCast API responses

CREATE TABLE IF NOT EXISTS rentcast_valuations (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES non_cash_assets(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  estimated_value DECIMAL(12,2) NOT NULL,
  price_range_low DECIMAL(12,2),
  price_range_high DECIMAL(12,2),
  subject_property JSONB,
  comparables JSONB,
  raw_response JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rentcast_valuations_asset_id ON rentcast_valuations(asset_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_valuations_account_id ON rentcast_valuations(account_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_valuations_fetched_at ON rentcast_valuations(asset_id, fetched_at DESC);

ALTER TABLE rentcast_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rentcast valuations for their accounts"
  ON rentcast_valuations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = rentcast_valuations.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

-- Inserts happen via service role during sync jobs

-- =====================================================
-- SCHEDULED JOB: MONTHLY RENTCAST SYNC
-- =====================================================

DO $$
DECLARE
  next_monthly_run TIMESTAMPTZ;
BEGIN
  -- First day of next month at 9 AM UTC
  next_monthly_run := DATE_TRUNC('month', NOW() + INTERVAL '1 month') + INTERVAL '9 hours';

  INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
  SELECT
    'rentcast_sync',
    'pending',
    next_monthly_run,
    '{"schedule": "0 9 1 * *"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_jobs
    WHERE job_type = 'rentcast_sync' AND status = 'pending'
  );
END $$;

COMMIT;
