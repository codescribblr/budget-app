-- Migration: 070_add_merchant_logos_storage.sql
-- Description: Add storage bucket and RLS policies for merchant logos
-- Date: 2025-01-XX
-- Note: This migration assumes the 'merchant-logos' bucket exists in Supabase Storage
-- Create the bucket manually in Dashboard → Storage → New bucket (name: 'merchant-logos', public)

BEGIN;

-- Enable RLS on storage.objects (if not already enabled)
-- Note: RLS is typically enabled by default on storage.objects

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Admins can upload merchant logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view merchant logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete merchant logos" ON storage.objects;

-- Policy: Allow admins to upload logos
CREATE POLICY "Admins can upload merchant logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'merchant-logos' AND
  is_current_user_admin()
);

-- Policy: Allow everyone to view logos (public access)
CREATE POLICY "Anyone can view merchant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'merchant-logos');

-- Policy: Allow admins to delete logos
CREATE POLICY "Admins can delete merchant logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'merchant-logos' AND
  is_current_user_admin()
);

COMMIT;
