-- Migration 019: Add category type, priority, and target fields
-- Date: 2025-11-22
-- Description: Add variable income enhancement fields to categories table

-- Add new columns to categories table
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS category_type VARCHAR(20) DEFAULT 'monthly_expense',
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS monthly_target DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS annual_target DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS target_balance DECIMAL(10,2);

-- Add check constraints
DO $$ 
BEGIN
  -- Check if constraint exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_category_type_check'
  ) THEN
    ALTER TABLE categories 
      ADD CONSTRAINT categories_category_type_check 
      CHECK (category_type IN ('monthly_expense', 'accumulation', 'target_balance'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_priority_check'
  ) THEN
    ALTER TABLE categories 
      ADD CONSTRAINT categories_priority_check 
      CHECK (priority >= 1 AND priority <= 10);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN categories.category_type IS 'Type of category: monthly_expense (regular spending), accumulation (periodic expenses), target_balance (buffer/emergency fund)';
COMMENT ON COLUMN categories.priority IS 'Funding priority from 1 (highest) to 10 (lowest). Used by smart allocation.';
COMMENT ON COLUMN categories.monthly_target IS 'Target amount to fund each month. For monthly_expense categories.';
COMMENT ON COLUMN categories.annual_target IS 'Annual target amount. For accumulation categories.';
COMMENT ON COLUMN categories.target_balance IS 'Target balance to maintain. For target_balance categories.';


