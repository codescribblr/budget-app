-- Migration: 078_add_asset_address_vin.sql
-- Description: Add address field for real estate assets and VIN field for vehicle assets
-- Date: 2025-01-XX

BEGIN;

-- Add address field for real estate assets
ALTER TABLE non_cash_assets
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add VIN field for vehicle assets
ALTER TABLE non_cash_assets
ADD COLUMN IF NOT EXISTS vin TEXT;

-- Add comments for documentation
COMMENT ON COLUMN non_cash_assets.address IS 'Street address for real estate assets. Used for potential integration with real estate value APIs.';
COMMENT ON COLUMN non_cash_assets.vin IS 'Vehicle Identification Number (VIN) for vehicle assets. Used for potential integration with auto value APIs.';

COMMIT;
