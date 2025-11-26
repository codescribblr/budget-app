-- Migration: 034_ensure_linked_goal_id_column.sql
-- Description: Ensure linked_goal_id column exists in accounts table (fixes PGRST204 cache issue)
-- Date: 2025-01-16

-- Ensure linked_goal_id column exists (should already exist from migration 012)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linked_goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_accounts_linked_goal ON accounts(linked_goal_id);

-- Refresh PostgREST schema cache (this helps fix PGRST204 errors)
-- Note: This requires the pgrst schema to exist and be accessible
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_notify fails, that's okay - the column still exists
    NULL;
END $$;

