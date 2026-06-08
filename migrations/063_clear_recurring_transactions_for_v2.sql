-- Migration: 063_clear_recurring_transactions_for_v2.sql
-- Description: Remove all legacy recurring transaction data before V2 rollout.
--              Pre-V2 detection results and matches are incompatible with the
--              new algorithm, classification fields, and lifecycle UI.
-- Date: 2026-06-08

BEGIN;

-- User feedback and missed-occurrence records are tied to the old patterns.
TRUNCATE TABLE recurring_user_feedback;

-- CASCADE also clears recurring_transaction_matches and recurring_missed_occurrences.
TRUNCATE TABLE recurring_transactions RESTART IDENTITY CASCADE;

COMMIT;
