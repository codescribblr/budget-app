-- Migration: 053_add_processing_tasks_tracking.sql
-- Description: Add processing_tasks JSONB field to track completion status of import processing tasks
-- Date: 2025-01-XX

BEGIN;

-- Add processing_tasks field to track which tasks have been completed
ALTER TABLE queued_imports
  ADD COLUMN IF NOT EXISTS processing_tasks JSONB DEFAULT '{}'::jsonb;

-- Index for querying batches with incomplete tasks
CREATE INDEX IF NOT EXISTS idx_queued_imports_processing_tasks ON queued_imports USING GIN (processing_tasks);

-- Comments for documentation
COMMENT ON COLUMN queued_imports.processing_tasks IS 'JSONB object tracking completion status of processing tasks. Format: {"pdf_to_csv": true, "csv_mapping": true, "duplicate_detection": false, "categorization": false, "default_account_assignment": false, "historical_flag_assignment": false}';

COMMIT;

