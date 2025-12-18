-- Migration 054: Add category archiving
-- Date: 2025-12-17
-- Description: Add is_archived flag to categories to allow hiding categories without deleting history

BEGIN;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to keep active-category queries fast
CREATE INDEX IF NOT EXISTS idx_categories_account_active
  ON categories(account_id, sort_order)
  WHERE is_archived = FALSE;

COMMENT ON COLUMN categories.is_archived IS 'Whether the category is archived. Archived categories are hidden from active workflow surfaces but preserved for historical reporting.';

COMMIT;

