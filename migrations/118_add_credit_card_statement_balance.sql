-- Migration: 118_add_credit_card_statement_balance.sql
-- Description: Add statement balance fields for monthly CC debt reconciliation
-- Date: 2026-07-10

BEGIN;

ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS statement_balance DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS statement_balance_as_of DATE;

COMMENT ON COLUMN credit_cards.statement_balance IS
  'Balance from the most recent statement, updated at import/reconcile time. Tracks debt being paid down; separate from in-month category spending.';
COMMENT ON COLUMN credit_cards.statement_balance_as_of IS
  'Statement close date or date the statement balance was last entered.';

COMMIT;
