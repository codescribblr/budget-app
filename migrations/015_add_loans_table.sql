-- Migration: 015_add_loans_table.sql
-- Description: Add loans table for tracking debts and liabilities
-- Date: 2025-01-22

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5,2),
  minimum_payment DECIMAL(10,2),
  payment_due_date INTEGER CHECK (payment_due_date >= 1 AND payment_due_date <= 31),
  open_date DATE,
  starting_balance DECIMAL(10,2),
  institution TEXT,
  include_in_net_worth BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

-- Enable Row Level Security
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE loans IS 'Tracks user loans and debts. Loans are liabilities and do not affect cash-based budget totals.';

