-- Migration: 120_imported_transactions_hash_unique_per_account.sql
-- Description: Allow the same import hash in different budget accounts
-- Date: 2026-08-28

BEGIN;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'imported_transactions'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) ILIKE '%hash%'
    AND pg_get_constraintdef(c.oid) ILIKE '%user_id%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE imported_transactions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

DROP INDEX IF EXISTS imported_transactions_user_id_hash_key;

ALTER TABLE imported_transactions
  DROP CONSTRAINT IF EXISTS imported_transactions_account_id_hash_key;

ALTER TABLE imported_transactions
  ADD CONSTRAINT imported_transactions_account_id_hash_key UNIQUE (account_id, hash);

COMMIT;
