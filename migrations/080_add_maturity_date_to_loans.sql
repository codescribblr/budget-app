-- Migration: 080_add_maturity_date_to_loans.sql
-- Description: Add maturity_date field to loans table for tracking when loans are paid off
-- Date: 2026-01-29

-- Add maturity_date column to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS maturity_date DATE;

-- Add comment
COMMENT ON COLUMN loans.maturity_date IS 'Date when the loan will be fully paid off. Used in forecast calculations to remove loan payments from expenses after payoff.';

-- Create index for maturity_date queries
CREATE INDEX IF NOT EXISTS idx_loans_maturity_date ON loans(maturity_date) WHERE maturity_date IS NOT NULL;
