# Database Backup & Restore Guide

## Overview

Since Supabase free tier doesn't include automated backups, these scripts allow you to manually create and restore database backups using PostgreSQL's `pg_dump` and `psql` tools.

## Prerequisites

1. **PostgreSQL tools installed** - You need `pg_dump` and `psql` on your system
   - **macOS**: `brew install postgresql` (or use Postgres.app)
   - **Linux**: `sudo apt-get install postgresql-client`
   - **Windows**: Install from [PostgreSQL downloads](https://www.postgresql.org/download/)

2. **Supabase database URL** - Get this from your Supabase project:
   - Go to Project Settings → Database
   - Copy the "Connection string" under "Connection pooling"
   - Replace `[YOUR-PASSWORD]` with your actual database password

## Quick Start

### 1. Set Your Database URL

```bash
# Add to your ~/.bashrc or ~/.zshrc for permanent use
export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'
```

Or set it temporarily for the current session:

```bash
export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'
```

### 2. Create a Backup

```bash
cd budget-app
./scripts/backup-supabase.sh
```

This will:
- Create a timestamped SQL dump file in `database/backups/`
- Exclude Supabase system schemas (auth, storage, etc.)
- Show the backup file size and location
- List recent backups

**Example output:**
```
🗄️  Supabase Database Backup

📦 Creating backup...
   Backup file: database/backups/backup_20250114_153045.sql

✅ Backup completed successfully!

   📁 File: database/backups/backup_20250114_153045.sql
   📊 Size: 245K

ℹ️  Total backups: 3

💡 To restore this backup later, run:
   ./scripts/restore-supabase.sh database/backups/backup_20250114_153045.sql
```

### 3. Restore from a Backup

```bash
./scripts/restore-supabase.sh database/backups/backup_20250114_153045.sql
```

**⚠️ WARNING:** This will DROP and recreate all tables, losing current data!

The script will:
- Show backup file details
- Ask for confirmation
- Restore the database
- Reload the PostgREST schema cache

## Common Use Cases

### Before Testing New Features

```bash
# Create a backup before testing
./scripts/backup-supabase.sh

# Test your feature...

# If something goes wrong, restore
./scripts/restore-supabase.sh database/backups/backup_YYYYMMDD_HHMMSS.sql
```

### Before Importing Historical Transactions

```bash
# 1. Create a backup
./scripts/backup-supabase.sh

# 2. Run the migration
./scripts/run-migrations.sh

# 3. Test importing historical transactions
# (Use the import page with "Import as historical" checked)

# 4. If needed, restore the backup
./scripts/restore-supabase.sh database/backups/backup_YYYYMMDD_HHMMSS.sql
```

### Regular Backups

```bash
# Create a weekly backup (add to cron or run manually)
./scripts/backup-supabase.sh
```

## Backup File Management

### List All Backups

```bash
ls -lht database/backups/
```

### Delete Old Backups

```bash
# Delete backups older than 30 days
find database/backups/ -name "backup_*.sql" -mtime +30 -delete
```

### Keep Only Last 5 Backups

```bash
cd database/backups
ls -t backup_*.sql | tail -n +6 | xargs rm -f
```

## What's Included in Backups

✅ **Included:**
- All your tables (transactions, categories, accounts, etc.)
- All your data
- Table structures and constraints
- Indexes
- Your custom functions and triggers

❌ **Excluded:**
- Supabase system schemas (auth, storage, realtime, etc.)
- User authentication data (managed by Supabase)
- File storage data (managed by Supabase)
- RLS policies (you'll need to reapply these if restoring to a new project)

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`

### "connection refused" or "authentication failed"

Check your `SUPABASE_DB_URL`:
1. Make sure you replaced `[YOUR-PASSWORD]` with your actual password
2. Verify the URL is correct in Supabase dashboard
3. Check if your IP is allowed (Supabase free tier allows all IPs by default)

### Backup file is empty or very small

The backup might have failed. Check:
1. Your database connection
2. That you have data in your database
3. The error messages in the terminal

### Restore fails with "permission denied"

This usually means you're trying to restore system schemas. The backup script excludes these by default, but if you're using a backup from another source, you may need to edit it.

## Best Practices

1. **Backup before major changes** - Always create a backup before:
   - Running migrations
   - Importing large datasets
   - Testing new features
   - Making schema changes

2. **Test your backups** - Periodically test restoring to ensure backups work

3. **Store backups safely** - Consider copying important backups to:
   - Cloud storage (Google Drive, Dropbox, etc.)
   - External hard drive
   - Another computer

4. **Keep multiple backups** - Don't rely on just one backup

5. **Document your backups** - Add notes about what state the database was in:
   ```bash
   # Example: Rename backup with description
   mv database/backups/backup_20250114_153045.sql \
      database/backups/backup_20250114_before_historical_import.sql
   ```

## Automation (Optional)

### Daily Backups with Cron

Add to your crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/budget-app && SUPABASE_DB_URL='your-url' ./scripts/backup-supabase.sh
```

### Backup with Cleanup

Create a script that backs up and keeps only the last 7 backups:

```bash
#!/bin/bash
cd /path/to/budget-app

./scripts/backup-supabase.sh
cd database/backups
ls -t backup_*.sql | tail -n +8 | xargs rm -f
```

## Notes

- Backups are stored in `database/backups/` (gitignored)
- Backup filenames include timestamp: `backup_YYYYMMDD_HHMMSS.sql`
- The scripts use PostgreSQL's standard tools (`pg_dump` and `psql`)
- Backups are plain SQL files that you can inspect with any text editor

