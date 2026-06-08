-- Migration: 043_add_import_metadata.sql
-- Description: Add metadata column to imported_transactions to store original row data and import metadata
-- Date: 2025-01-XX

BEGIN;

-- Add metadata JSONB column to store original row data and other import metadata
ALTER TABLE imported_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for JSONB queries (useful for searching metadata)
CREATE INDEX IF NOT EXISTS idx_imported_transactions_metadata 
  ON imported_transactions USING GIN(metadata);

-- Add comment to explain the column
COMMENT ON COLUMN imported_transactions.metadata IS 
  'JSONB object storing original CSV row data, suggested categories/merchants, and other import metadata';

COMMIT;


