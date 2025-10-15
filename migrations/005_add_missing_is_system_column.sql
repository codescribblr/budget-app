-- Migration: 005_add_missing_is_system_column.sql
-- Description: Add is_system column to categories table if it doesn't exist
-- Date: 2025-10-15

-- Add is_system column to categories table
-- This column was in migration 001 but may have been skipped if the table already existed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'categories' 
      AND column_name = 'is_system'
  ) THEN
    ALTER TABLE categories 
      ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
    
    RAISE NOTICE 'Added is_system column to categories table';
  ELSE
    RAISE NOTICE 'is_system column already exists in categories table';
  END IF;
END $$;

