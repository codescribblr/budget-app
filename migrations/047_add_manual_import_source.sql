-- Migration: 047_add_manual_import_source.sql
-- Description: Add 'manual' as a valid source_type for manual file uploads
-- Date: 2025-01-XX

BEGIN;

-- Add 'manual' to the allowed source_type values
ALTER TABLE automatic_import_setups 
  DROP CONSTRAINT IF EXISTS automatic_import_setups_source_type_check;

ALTER TABLE automatic_import_setups 
  ADD CONSTRAINT automatic_import_setups_source_type_check 
  CHECK (source_type IN (
    'email', 
    'plaid', 
    'yodlee', 
    'finicity', 
    'mx', 
    'teller',
    'manual'
  ));

COMMIT;
