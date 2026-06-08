-- Migration: 071_add_icon_name_to_global_merchants.sql
-- Description: Add icon_name column to global_merchants to support icon selection from react-icons
-- Date: 2025-01-XX

BEGIN;

-- Add icon_name column to store the react-icons component name (e.g., 'SiAmazon', 'SiVisa')
ALTER TABLE global_merchants
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

-- Add index for icon_name lookups
CREATE INDEX IF NOT EXISTS idx_global_merchants_icon_name ON global_merchants(icon_name) WHERE icon_name IS NOT NULL;

COMMIT;
