-- Migration: 066_add_status_column_to_templates.sql
-- Description: Add status_column to csv_import_templates for filtering pending transactions
-- Date: 2025-01-XX

BEGIN;

-- Add status_column to csv_import_templates table
ALTER TABLE csv_import_templates
  ADD COLUMN IF NOT EXISTS status_column INTEGER;

-- Comment for documentation
COMMENT ON COLUMN csv_import_templates.status_column IS 'Column index containing transaction status (e.g., "pending", "cleared", "posted"). Used to filter out pending transactions during import.';

COMMIT;
