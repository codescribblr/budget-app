# Private deployment backups and recovery

Deployment backups contain customer financial data. This repository is public: **never upload SQL, decrypted archives or restore logs as GitHub Actions artifacts**.

## Storage and keys

The production workflow creates a temporary application-schema SQL dump and SHA-256 metadata, compresses them, encrypts with AES-256-GCM, and stores the result in the existing Supabase project's private `deployment-backups` bucket. A separate authenticated download must decrypt and match the original bytes before migrations begin. Any database-status, dump, upload, encryption or verification error stops deployment.

`BACKUP_ENCRYPTION_KEY` is a random 32-byte key encoded as 64 hex characters. GitHub stores it as an Actions secret; it is never a public Next.js variable. Keep recovery copies independently of GitHub. The configured recovery locations are the owner's gitignored `.env.backup-recovery` (0600) and web02's `/root/budget-recovery/backup-encryption.env` (0600, parent 0700). Never paste their contents into logs, tickets or source control. Losing every copy loses the backups. Retain old keys until all archives they protect are re-encrypted and verified; merely replacing the secret makes old archives unreadable.

The bucket must remain private, accept only `application/octet-stream`, and limit uploads to 50 MiB. The tool accepts at most 48 MiB compressed plaintext and binds each authenticated ciphertext to its exact object path. Do not rename objects. Migration 155 adds a restrictive RLS policy denying both `anon` and `authenticated` access to this bucket, even if other permissive policies exist. Only trusted service-role operations should access it.

Production objects: `production/<run>-<attempt>-<commit>.tar.gz.enc`.
Preserved historical objects: `legacy/<original-artifact-name>.zip.enc`.
Synthetic CI checks: `verification/<run>-<attempt>.zip.enc` (contain no customer data).

These small archives use the existing Supabase storage quota. Inspect usage monthly. Retain at least the latest five verified production backups, all backups inside the release rollback window, and incident-recovery copies. After a successful recovery rehearsal, archives older than 90 days can be removed through privileged storage administration. Historical copies are initially preserved rather than automatically expired. Configure an independent encrypted off-provider copy before treating this as complete Supabase disaster recovery.

## Verification and retrieval

Use a trusted shell with `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `BACKUP_ENCRYPTION_KEY` securely loaded into the environment. Node 24 and Python 3 suffice; no npm install is needed.

```bash
node --test scripts/private-backup.test.mjs
python3 scripts/private-backup-test.py
node scripts/private-backup.mjs list production
node scripts/private-backup.mjs list legacy
umask 077
node scripts/private-backup.mjs download 'production/<exact-object>.tar.gz.enc' /private/path/backup.archive
python3 scripts/extract-private-backup.py /private/path/backup.archive /private/path/extracted
```

Extraction accepts only one flat SQL/metadata pair, rejects links/traversal/extra files, limits expansion and verifies the SQL checksum. Download and extraction refuse to overwrite existing files. Clean up decrypted files after use. GitHub's **Verify Private Backups** workflow performs encryption failure tests, safe extraction tests, migration-check error tests, and a synthetic storage upload/download without reading production SQL.

## Production restore

A database restore is a separate, manual operation: it can discard valid transactions written after the backup. Prefer application rollback when the current schema remains compatible. Rehearse database recovery against a disposable Supabase-compatible database first; checksum verification alone is not a full restore rehearsal.

1. Identify the exact private object and a compatible application release; arrange a write-maintenance window.
2. Run **Rollback Database** on `main`, enter the object path and the exact confirmation `RESTORE PRODUCTION`.
3. The `production-recovery` GitHub environment requires the owner's approval and permits only `main`.
4. The job checks private storage, decrypts/authenticates, validates the SQL checksum, and restores with `psql -X -v ON_ERROR_STOP=1 --single-transaction`. SQL errors stop and roll back the transaction. Private SQL/restore output is not published.
5. Verify application permissions/RLS, financial totals and integrations before reopening writes. The workflow never changes the application release automatically.

Existing `scripts/restore-supabase.sh` is a legacy local SQL utility; it does not provide authenticated private-archive recovery. Use the reviewed workflow for production.

## Scope and limitations

These dumps preserve application schemas and data, including their RLS policies, but exclude Supabase-managed auth/storage/realtime schemas, storage object contents, ownership and grants. Recovery requires the existing managed services and appropriate application grants. They cannot independently recreate an entire Supabase project. The storage protection policy is in `storage.objects`, outside the application's dump, so restoring an application backup does not remove it.

Security remediation preserves each historical GitHub artifact in encrypted private storage, verifies its downloaded bytes and SQL checksum, then deletes the public artifact. Removal prevents future downloads from GitHub; it cannot revoke copies previously downloaded. Assess any incident follow-up separately using available access evidence.


## Cloud Panel storage

Set repository variables `BACKUP_STORAGE_BACKEND=cloud-panel`, `CLOUD_BACKUP_URL=https://cloud.jrwdev.com` and `CLOUD_BACKUP_APP_ID` to the budget production app. Set `CLOUD_BACKUP_TOKEN` as a secret containing an expiring app/environment-scoped credential with only `backup:read` and `backup:write`. Keep `BACKUP_ENCRYPTION_KEY` and its recovery copies unchanged. The encryption key is never sent to Cloud Panel.

The deployment, verification and reviewed recovery workflows select this backend through the same client. Cloud Panel uploads independently download and authenticate the archive, confirm its ciphertext and plaintext digests, submit a verification receipt and wait for a second encrypted copy on web02. Failure to confirm that replica stops the backup gate. Supabase Storage remains an explicit fallback backend for portability; selecting Cloud Panel requires no Supabase Storage credentials. The database dump still uses the existing Supabase database while application hosting is migrated separately.

When moving existing archives, preserve their object paths and ciphertext. Download and authenticate each original, validate the SQL archive against its metadata, import it into Cloud Panel, independently download/decrypt/validate the new copy, and wait for its server replica before deleting the Supabase copy. `BackupStorage.importEncrypted` supports that operation without changing the recovery key or format. Keep a private verification ledger; never put SQL dumps, recovery keys or credentials into GitHub artifacts.

A provider change does not remove the `production-recovery` reviewer requirement or permit automatic database restoration. Rotate the scoped backup credential before its expiry. Cloud Panel retention preserves legacy incident archives, at least five verified production recovery points and 90 days of ordinary backups; verification objects expire after seven days.
