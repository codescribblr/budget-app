-- Migration: 115_add_audit_backfill_change_type.sql
-- Description: Allow audit_backfill entries when rebuilding category balance audit trails
-- Date: 2026-06-15

BEGIN;

ALTER TABLE category_balance_audit
  DROP CONSTRAINT IF EXISTS category_balance_audit_change_type_check;

ALTER TABLE category_balance_audit
  ADD CONSTRAINT category_balance_audit_change_type_check
  CHECK (change_type IN (
    'transaction_create',
    'transaction_update',
    'transaction_delete',
    'transaction_import',
    'allocation_batch',
    'allocation_manual',
    'allocation_income',
    'transfer_from',
    'transfer_to',
    'manual_edit',
    'transaction_merge',
    'income_buffer_fund',
    'audit_backfill'
  ));

COMMENT ON COLUMN category_balance_audit.change_type IS
  'Type of change: transaction_create, transaction_update, transaction_delete, transaction_import, allocation_batch, allocation_manual, allocation_income, transfer_from, transfer_to, manual_edit, transaction_merge, income_buffer_fund, audit_backfill';

COMMIT;
