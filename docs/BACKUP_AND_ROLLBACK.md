# Database Backup and Rollback Guide

## Overview

This guide explains how automatic database backups work during deployments and how to rollback if something goes wrong.

## Automatic Backups During Deployment

### How It Works

When you push to the `main` branch:

1. **Check for Pending Migrations**: The workflow checks if there are any pending migrations
2. **Create Backup** (if migrations pending): Before running migrations, a backup is automatically created
3. **Store Backup**: The backup is stored as a GitHub Actions artifact for 90 days
4. **Run Migrations**: Migrations are executed
5. **Deploy**: Application is deployed to Vercel

### Backup Storage

Backups are stored in two places:

1. **GitHub Actions Artifacts**: Automatically uploaded and kept for 90 days
   - Accessible from: Repository → Actions → Select workflow run → Artifacts
   - Artifact name format: `db-backup-{run_id}-{commit_sha}`

2. **Backup Metadata**: Each backup includes a JSON metadata file with:
   - Commit SHA and short hash
   - Branch name
   - Timestamp
   - Pending migrations that were about to run
   - File size

### When Backups Are Created

- ✅ **Backups ARE created** when there are pending migrations
- ❌ **Backups are NOT created** when there are no pending migrations (no changes needed)

This ensures backups are only created when necessary, saving storage and time.

## Manual Rollback Process

If something goes wrong after a deployment, you can rollback the database using the GitHub Actions workflow.

### Step 1: Find the Backup Artifact

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Find the deployment run that created the backup (look for runs with artifacts)
4. Click on the workflow run
5. Scroll down to the **Artifacts** section
6. Note the artifact name (format: `db-backup-{run_id}-{commit_sha}`)

### Step 2: Trigger Rollback Workflow

1. Go to **Actions** tab
2. Select **Rollback Database** workflow from the left sidebar
3. Click **Run workflow** button
4. Fill in the form:
   - **Backup artifact name**: Enter the artifact name from Step 1 (e.g., `db-backup-123456789-abc1234`)
   - **Confirm rollback**: Type `ROLLBACK` (all caps) to confirm
5. Click **Run workflow**

### Step 3: Monitor the Rollback

- The workflow will download the backup artifact
- Display backup metadata (commit, timestamp, etc.)
- Restore the database from the backup
- Show success/failure status

### Step 4: Redeploy if Needed

After rolling back the database, you may need to:

1. **Revert code changes** if the issue was in the code:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

2. **Or redeploy the previous version** if the database schema doesn't match the current code

## Local Backup and Restore

You can also create backups manually using the scripts:

### Create a Backup

```bash
export SUPABASE_DB_URL='your-connection-string'
./scripts/backup-supabase.sh
```

### Restore from Backup

```bash
export SUPABASE_DB_URL='your-connection-string'
./scripts/restore-supabase.sh database/backups/backup_YYYYMMDD_HHMMSS.sql
```

## Backup Artifact Management

### Viewing Artifacts

1. Go to Repository → Actions
2. Click on any workflow run
3. Scroll to the bottom to see **Artifacts** section
4. Click on an artifact to download it

### Downloading Artifacts Locally

1. Download the artifact ZIP file from GitHub Actions
2. Extract it to get:
   - `backup_YYYYMMDD_HHMMSS.sql` - The database backup
   - `backup_YYYYMMDD_HHMMSS.metadata.json` - Backup metadata

### Restoring from Downloaded Artifact

```bash
# Extract the artifact ZIP file
unzip db-backup-*.zip -d database/backups/

# Restore using the restore script
export SUPABASE_DB_URL='your-connection-string'
./scripts/restore-supabase.sh database/backups/backup_YYYYMMDD_HHMMSS.sql
```

## Troubleshooting

### "No backup artifact found"

- Check that the deployment actually had pending migrations
- Verify the artifact name is correct (case-sensitive)
- Artifacts expire after 90 days - older backups may not be available

### "Rollback failed"

- Check that `SUPABASE_DB_URL` secret is set correctly in GitHub
- Verify the backup file is not corrupted
- Check GitHub Actions logs for detailed error messages

### "Database restored but app still broken"

- The database may have been rolled back, but the code version doesn't match
- You may need to revert code changes or redeploy the previous version
- Check the backup metadata to see which commit the backup was from

### Backup Not Created

- This is normal if there were no pending migrations
- Only deployments with pending migrations create backups
- You can manually create a backup anytime using `./scripts/backup-supabase.sh`

## Best Practices

1. **Test migrations locally** before pushing to production
2. **Review migration files** before committing
3. **Monitor deployments** to ensure backups are created when expected
4. **Keep multiple backups** - GitHub Actions keeps artifacts for 90 days
5. **Document rollbacks** - If you rollback, document why and what was fixed

## Backup Metadata Example

```json
{
  "backup_file": "backup_20250120_143022.sql",
  "timestamp": "20250120_143022",
  "created_at": "2025-01-20T14:30:22Z",
  "commit_sha": "abc123def456...",
  "commit_short": "abc1234",
  "branch": "main",
  "git_ref": "refs/heads/main",
  "run_id": "123456789",
  "file_size": "245K",
  "pending_migrations": "022_add_subscriptions.sql, 023_add_new_feature.sql",
  "backup_type": "pre_migration"
}
```

## Related Scripts

- `scripts/check-pending-migrations.sh` - Check if migrations are pending
- `scripts/backup-with-metadata.sh` - Create backup with deployment metadata
- `scripts/backup-supabase.sh` - Manual backup script
- `scripts/restore-supabase.sh` - Restore from backup script
- `scripts/run-migrations.sh` - Run database migrations

## Workflow Files

- `.github/workflows/deploy.yml` - Main deployment workflow (includes backup)
- `.github/workflows/rollback.yml` - Manual rollback workflow



