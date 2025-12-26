-- Migration: 058_add_automatic_import_mapping.sql
-- Description: Add CSV mapping template reference to automatic_import_setups for remapping support
-- Date: 2025-01-XX

BEGIN;

-- Add template reference to automatic_import_setups
-- This works for BOTH CSV-based and API-based imports
-- For CSV imports: References the CSV template directly
-- For API imports: References a template created from API data (virtual CSV)
ALTER TABLE automatic_import_setups
  ADD COLUMN IF NOT EXISTS csv_mapping_template_id BIGINT REFERENCES csv_import_templates(id) ON DELETE SET NULL;

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_automatic_import_setups_template_id ON automatic_import_setups(csv_mapping_template_id);

-- Comments
COMMENT ON COLUMN automatic_import_setups.csv_mapping_template_id IS 'CSV import template to use for automatic imports. Works for both CSV-based (email) and API-based (Teller, Plaid) imports. For API imports, template stores amount_sign_convention and other mapping rules.';

COMMIT;

