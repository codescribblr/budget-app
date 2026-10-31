BEGIN;
-- Expand first: old servers still use the legacy user/key conflict target.
-- Keep that constraint through deployment; migration 150 retires it afterward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.settings'::regclass
      AND conname = 'settings_account_user_key'
  ) THEN
    ALTER TABLE public.settings ADD CONSTRAINT settings_account_user_key
      UNIQUE(account_id,user_id,key);
  END IF;
END;
$$;
COMMIT;
