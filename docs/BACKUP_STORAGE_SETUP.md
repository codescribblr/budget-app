# Backup Storage Setup Guide

## Overview

Backups are now stored in Supabase Storage (compressed) instead of the database JSONB column. This provides:
- **Better scalability**: Storage has 1GB free tier vs 500MB database limit
- **Compression**: Backups are gzip-compressed, reducing storage by ~70-80%
- **Tiered limits**: Free users get 3 backups, Premium users get 10 backups

## Storage Bucket Setup

### Create the Backups Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `backups`
4. Public bucket: **No** (private)
5. File size limit: Leave default or set to 10MB (compressed backups are typically 100KB-1MB)
6. Allowed MIME types: `application/gzip` (optional, for security)

### RLS Policies

The bucket should have RLS enabled. Create these policies:

```sql
-- Allow authenticated users to upload backups for their accounts
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

-- Allow authenticated users to download backups for their accounts
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

-- Allow authenticated users to delete backups for their accounts
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
```

## Migration Notes

### Backward Compatibility

The system supports both formats during migration:
- **New backups**: Stored in Storage (`storage_path` column)
- **Legacy backups**: Still in JSONB (`backup_data` column)

When restoring:
1. Check for `storage_path` first (new format)
2. Fall back to `backup_data` if `storage_path` is null (legacy format)

### Migration Path

1. Run migration `063_migrate_backups_to_storage.sql`
2. Create Storage bucket and policies (see above)
3. New backups will automatically use Storage
4. Legacy backups remain accessible via `backup_data`
5. Future migration can remove `backup_data` column after all backups are migrated

## Storage Structure

```
backups/
  {account_id}/
    {timestamp}-{random}.json.gz
```

Example:
```
backups/
  123/
    1704067200000-abc123def456.json.gz
    1704153600000-xyz789uvw012.json.gz
```

## Compression

Backups are compressed using gzip:
- **Typical compression ratio**: 70-80% reduction
- **Average backup size**: 50KB-500KB (uncompressed: 200KB-2MB)
- **Format**: JSON → UTF-8 → gzip → Storage

## Limits

- **Free tier**: 3 backups per account
- **Premium tier**: 10 backups per account
- **Storage limit**: Supabase free tier provides 1GB Storage (vs 500MB database)

## Cleanup

Old backups are automatically cleaned up when:
- User deletes a backup (removes both DB record and Storage file)
- Account is deleted (CASCADE deletes all backups)

Manual cleanup of orphaned files:
```sql
-- Find backups without DB records
SELECT name FROM storage.objects 
WHERE bucket_id = 'backups' 
AND name NOT IN (
  SELECT storage_path FROM user_backups WHERE storage_path IS NOT NULL
);
```


