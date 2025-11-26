-- Migration: 039_add_transaction_type_to_import_templates.sql
-- Description: Add transaction_type_column to csv_import_templates
-- Date: 2025-01-20

-- Add transaction_type_column to store which CSV column indicates income/expense
ALTER TABLE csv_import_templates 
ADD COLUMN IF NOT EXISTS transaction_type_column INTEGER;

-- Add amount_sign_convention to handle different bank formats
-- 'positive_is_expense': positive amounts are expenses (most common)
-- 'positive_is_income': positive amounts are income (less common)
-- 'separate_column': use transaction_type_column to determine type
-- 'separate_debit_credit': use debit_column and credit_column to determine type and amount
ALTER TABLE csv_import_templates 
ADD COLUMN IF NOT EXISTS amount_sign_convention TEXT 
CHECK (amount_sign_convention IN ('positive_is_expense', 'positive_is_income', 'separate_column', 'separate_debit_credit'))
DEFAULT 'positive_is_expense';

COMMENT ON COLUMN csv_import_templates.transaction_type_column IS 'Column index that contains transaction type (e.g., "DEBIT", "CREDIT", "INCOME", "EXPENSE"). Used when amount_sign_convention is "separate_column"';
COMMENT ON COLUMN csv_import_templates.amount_sign_convention IS 'How to interpret amount signs: positive_is_expense (default), positive_is_income, separate_column, or separate_debit_credit';

