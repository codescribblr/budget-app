-- Migration: 057_add_tag_ids_to_queued_imports.sql
-- Description: Add tag_ids support to queued_imports table
-- Date: 2025-01-20

BEGIN;

-- Add tag_ids column to queued_imports (stored as array of tag IDs)
-- Note: tags.id is BIGINT (BIGSERIAL), so we use BIGINT[] to match
ALTER TABLE queued_imports
  ADD COLUMN IF NOT EXISTS tag_ids BIGINT[] DEFAULT '{}';

-- Add index for tag lookups
CREATE INDEX IF NOT EXISTS idx_queued_imports_tag_ids ON queued_imports USING GIN(tag_ids);

COMMIT;

