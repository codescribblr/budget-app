-- migration-phase: post-deploy
BEGIN;
-- Run only after the server release uses (account_id,user_id,key).
-- Preserve all settings rows; remove only the obsolete cross-budget restriction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.settings'::regclass
      AND conname = 'settings_account_user_key'
  ) THEN
    RAISE EXCEPTION 'Apply settings scope migration 148 before retiring the legacy key';
  END IF;
END;
$$;
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_user_id_key_key;
COMMIT;
