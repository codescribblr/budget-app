# Migration Error Handling

## Overview

This document describes the error handling improvements made to the migration system to ensure that failed migrations are not marked as complete.

## Problem

Previously, if a migration encountered an error (e.g., SQL syntax error, constraint violation, or runtime error within a `DO $$` block), the migration runner might still mark it as complete in the `_migrations` table. This could happen because:

1. PostgreSQL transactions (`BEGIN;`/`COMMIT;`) roll back on error, but `psql` might not always detect this as a failure
2. Errors within `DO $$` blocks might not propagate correctly to the shell script
3. The migration runner didn't explicitly check for error patterns in the output

## Solution

### 1. Enhanced Bash Migration Runner (`scripts/run-migrations.sh`)

**Changes:**
- Added `-v ON_ERROR_STOP=1` flag to `psql` to ensure it exits immediately on any error
- Added explicit error detection by checking for "ERROR", "FATAL", or "syntax error" patterns in the output
- Only records migration as complete if execution succeeds AND no error patterns are found
- Provides clear error messages indicating that the migration was NOT recorded

**Key improvements:**
```bash
# Execute with error detection
MIGRATION_OUTPUT=$(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION_FILE" 2>&1)
MIGRATION_EXIT_CODE=$?

# Check for errors in output
if [ $MIGRATION_EXIT_CODE -ne 0 ] || echo "$MIGRATION_OUTPUT" | grep -qiE "ERROR|FATAL|syntax error"; then
  # Migration failed - do NOT record it
  exit 1
fi

# Only record if execution succeeded
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO $MIGRATIONS_TABLE ..."
```

### 2. Enhanced JavaScript Migration Runner (`scripts/run-migrations.js`)

**Changes:**
- Added try-catch around migration execution and recording
- Only records migration if execution succeeds without errors
- Added warnings for migrations using `BEGIN`/`COMMIT` blocks (recommends using bash script)
- Improved error detection in HTTP responses

**Key improvements:**
```javascript
try {
  await executeMigration(migration);
  // Only record migration if execution succeeded
  await recordMigration(migration);
} catch (error) {
  console.error(`Migration ${migration} failed and was NOT recorded`);
  throw error; // Re-throw to stop execution
}
```

### 3. Enhanced Migration File Error Handling

**Migration 085 (`migrations/085_migrate_user_groups_to_recommendations.sql`):**

**Changes:**
- Added exception handling within the `DO $$` block using `BEGIN...EXCEPTION...END` blocks
- Added validation checks with `RAISE EXCEPTION` for critical failures
- Added summary reporting with counts of processed and failed groups
- Raises exception if all groups fail to migrate (ensures migration fails completely)

**Key improvements:**
```sql
DO $$
BEGIN
  -- Process groups with exception handling
  FOR user_group IN ... LOOP
    BEGIN
      -- Migration logic here
      -- If critical error occurs, RAISE EXCEPTION
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other groups
        RAISE WARNING 'Error processing group: %', SQLERRM;
    END;
  END LOOP;
  
  -- Fail migration if all groups failed
  IF groups_processed = 0 AND groups_failed > 0 THEN
    RAISE EXCEPTION 'Migration failed: All groups failed';
  END IF;
END $$;
```

## Error Detection

The migration runners now detect errors through multiple mechanisms:

1. **Exit codes**: `psql` returns non-zero exit code on errors (with `ON_ERROR_STOP=1`)
2. **Error patterns**: Explicit checks for "ERROR", "FATAL", or "syntax error" in output
3. **Exception handling**: Migrations use `RAISE EXCEPTION` for critical failures
4. **Transaction rollback**: PostgreSQL automatically rolls back transactions on error

## Rollback Behavior

When a migration fails:

1. **Database changes are rolled back**: PostgreSQL transactions ensure atomicity
2. **Migration is NOT recorded**: The migration runner exits before recording
3. **Migration can be retried**: On next run, the migration will be attempted again
4. **Clear error messages**: Users see what went wrong and that the migration wasn't recorded

## Checking for Incorrectly Recorded Migrations

If a migration was incorrectly marked as complete before these fixes, you can:

1. **Check migration status**: Query the `_migrations` table
2. **Verify migration actually ran**: Check if the expected database changes exist
3. **Manually remove incorrect record**: Delete the row from `_migrations` table if needed
4. **Re-run migration**: The migration will be attempted again on next run

Example SQL to check:
```sql
-- List all recorded migrations
SELECT migration_name, executed_at 
FROM _migrations 
ORDER BY executed_at DESC;

-- Check if a specific migration's changes exist
-- (example for migration 085)
SELECT COUNT(*) FROM merchant_recommendations;
```

## Best Practices

1. **Always use transactions**: Wrap migrations in `BEGIN;`/`COMMIT;` blocks
2. **Use RAISE EXCEPTION**: For critical validation failures
3. **Test migrations locally**: Before deploying to production
4. **Use bash script**: For migrations with complex transactions or `DO $$` blocks
5. **Monitor migration logs**: Check output for warnings or errors

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/deploy.yml`) uses the bash migration runner. If a migration fails:

1. The workflow step fails
2. Deployment to Vercel is halted
3. Database backup (created before migrations) is available as an artifact
4. The migration can be fixed and retried

## Related Files

- `scripts/run-migrations.sh` - Bash migration runner
- `scripts/run-migrations.js` - JavaScript migration runner (fallback)
- `scripts/check-pending-migrations.sh` - Checks for pending migrations
- `migrations/085_migrate_user_groups_to_recommendations.sql` - Example migration with error handling
- `.github/workflows/deploy.yml` - CI/CD workflow that runs migrations
