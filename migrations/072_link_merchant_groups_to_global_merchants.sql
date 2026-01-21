-- Migration: 072_link_merchant_groups_to_global_merchants.sql
-- Description: Add global_merchant_id to merchant_groups to link user groups to global merchants
-- Date: 2025-01-XX

BEGIN;

-- Add global_merchant_id column to merchant_groups table
ALTER TABLE merchant_groups
ADD COLUMN IF NOT EXISTS global_merchant_id BIGINT REFERENCES global_merchants(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_merchant_groups_global_merchant_id ON merchant_groups(global_merchant_id);

-- Function to automatically link user merchant groups to global merchants by name
-- This will match existing user groups to global merchants if they have the same display_name
CREATE OR REPLACE FUNCTION link_existing_merchant_groups_to_global()
RETURNS void AS $$
BEGIN
  UPDATE merchant_groups mg
  SET global_merchant_id = gm.id
  FROM global_merchants gm
  WHERE mg.global_merchant_id IS NULL
    AND gm.status = 'active'
    AND LOWER(TRIM(mg.display_name)) = LOWER(TRIM(gm.display_name))
    AND NOT EXISTS (
      SELECT 1 FROM merchant_groups mg2
      WHERE mg2.global_merchant_id = gm.id
        AND mg2.user_id = mg.user_id
        AND mg2.account_id = mg.account_id
        AND mg2.id != mg.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to link existing groups
SELECT link_existing_merchant_groups_to_global();

-- Drop the function after use (it can be recreated if needed)
DROP FUNCTION IF EXISTS link_existing_merchant_groups_to_global();

COMMIT;
