-- Deployment dumps must never be readable/writable by browser API roles,
-- even if a future permissive storage policy accidentally includes all buckets.
DROP POLICY IF EXISTS deployment_backups_no_client_access ON storage.objects;
CREATE POLICY deployment_backups_no_client_access
ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'deployment-backups')
WITH CHECK (bucket_id <> 'deployment-backups');
