-- Migration: 051_add_import_mapping_fields.sql
-- Description: Add CSV mapping fields to queued_imports table for re-mapping capability
-- Date: 2025-01-XX

BEGIN;

-- Add fields to store CSV mapping information with queued imports
ALTER TABLE queued_imports
  ADD COLUMN IF NOT EXISTS csv_data JSONB, -- Store raw CSV data for re-mapping
  ADD COLUMN IF NOT EXISTS csv_analysis JSONB, -- Store CSV analysis result
  ADD COLUMN IF NOT EXISTS csv_mapping_template_id BIGINT REFERENCES csv_import_templates(id) ON DELETE SET NULL, -- Associated template
  ADD COLUMN IF NOT EXISTS csv_fingerprint TEXT, -- CSV fingerprint for template matching
  ADD COLUMN IF NOT EXISTS csv_file_name TEXT; -- Original filename

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_queued_imports_template_id ON queued_imports(csv_mapping_template_id);

-- Index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_queued_imports_fingerprint ON queued_imports(csv_fingerprint);

-- Comments for documentation
COMMENT ON COLUMN queued_imports.csv_data IS 'Raw CSV data stored as JSONB array for re-mapping capability';
COMMENT ON COLUMN queued_imports.csv_analysis IS 'CSV analysis result (column detection, date format, etc.) stored as JSONB';
COMMENT ON COLUMN queued_imports.csv_mapping_template_id IS 'Reference to the CSV import template used for this import';
COMMENT ON COLUMN queued_imports.csv_fingerprint IS 'CSV fingerprint used for template matching';
COMMENT ON COLUMN queued_imports.csv_file_name IS 'Original CSV filename';

COMMIT;
