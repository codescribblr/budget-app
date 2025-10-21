-- Migration 009: Add merchant_group_id to transactions
-- This migration adds merchant group tracking to transactions

-- Add merchant_group_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS merchant_group_id INTEGER REFERENCES merchant_groups(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_group_id ON transactions(merchant_group_id);

-- Update existing transactions to link to merchant groups based on description
-- This will automatically link transactions to existing merchant groups
UPDATE transactions t
SET merchant_group_id = (
  SELECT mm.merchant_group_id
  FROM merchant_mappings mm
  WHERE mm.pattern = t.description
    AND mm.user_id = t.user_id
    AND mm.merchant_group_id IS NOT NULL
  LIMIT 1
)
WHERE t.merchant_group_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM merchant_mappings mm
    WHERE mm.pattern = t.description
      AND mm.user_id = t.user_id
      AND mm.merchant_group_id IS NOT NULL
  );

