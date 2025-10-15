-- Migration: 002_fix_credit_card_balances.sql
-- Description: Fix current_balance calculation for existing credit cards
-- Date: 2025-01-15

-- Update all credit cards to have correct current_balance
-- current_balance should be: credit_limit - available_credit
UPDATE credit_cards
SET current_balance = credit_limit - available_credit
WHERE current_balance != (credit_limit - available_credit);

