-- Migration: 007_add_category_notes.sql
-- Description: Add notes column to categories table for tracking budget formulas and other notes
-- Date: 2025-10-15

-- Add notes column to categories table
DO $$ 
BEGIN
  -- Check if column doesn't already exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'categories' 
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE categories 
      ADD COLUMN notes TEXT;
    
    RAISE NOTICE 'Added notes column to categories table';
  ELSE
    RAISE NOTICE 'notes column already exists in categories table';
  END IF;
END $$;

