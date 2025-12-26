-- Migration: 064_add_backup_storage_rls.sql
-- Description: Add RLS policies for backups Storage bucket
-- Date: 2025-01-XX
-- Note: This assumes the 'backups' bucket exists in Supabase Storage
-- Create the bucket manually in Dashboard → Storage → New bucket (name: 'backups', private)

BEGIN;

-- Enable RLS on storage.objects (if not already enabled)
-- Note: RLS is typically enabled by default on storage.objects

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can upload backups for their accounts" ON storage.objects;
DROP POLICY IF EXISTS "Users can download backups for their accounts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete backups for their accounts" ON storage.objects;

-- Policy: Allow authenticated users to upload backups for their accounts
-- Users can upload backups if they own the account or are an active member
CREATE POLICY "Users can upload backups for their accounts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backups' AND
  (storage.foldername(name))[1]::bigint IN (
    SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
    UNION
    SELECT account_id FROM account_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Policy: Allow authenticated users to download backups for their accounts
CREATE POLICY "Users can download backups for their accounts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'backups' AND
  (storage.foldername(name))[1]::bigint IN (
    SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
    UNION
    SELECT account_id FROM account_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Policy: Allow authenticated users to delete backups for their accounts
CREATE POLICY "Users can delete backups for their accounts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'backups' AND
  (storage.foldername(name))[1]::bigint IN (
    SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
    UNION
    SELECT account_id FROM account_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

COMMIT;

