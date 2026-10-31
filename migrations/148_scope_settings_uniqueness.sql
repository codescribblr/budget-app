BEGIN;
-- A user may belong to several budgets. A setting in one must not be moved
-- into another by an upsert. Preserve all existing rows and per-user keys.
ALTER TABLE public.settings DROP CONSTRAINT settings_user_id_key_key;
ALTER TABLE public.settings ADD CONSTRAINT settings_account_user_key UNIQUE(account_id,user_id,key);
COMMIT;
