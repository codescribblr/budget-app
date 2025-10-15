# Troubleshooting Guide

## Error: "Could not find the 'is_system' column"

This error indicates that Supabase's PostgREST schema cache is out of sync with the actual database schema.

### Quick Fix

**Option 1: Reload Schema via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Scroll down to **Schema Cache**
4. Click **"Reload schema"** button

**Option 2: Reload Schema via SQL**
1. Go to **SQL Editor** in Supabase dashboard
2. Run this command:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

**Option 3: Wait for Auto-Reload**
- PostgREST automatically reloads the schema cache periodically (usually every few minutes)
- Try waiting 2-3 minutes and then retry your operation

### Verify Migrations Ran

To check if migrations have been applied:

1. Go to **SQL Editor** in Supabase dashboard
2. Run this query:
   ```sql
   SELECT migration_name, executed_at 
   FROM _migrations 
   ORDER BY executed_at;
   ```

You should see:
- `001_initial_schema.sql`
- `002_add_imported_transactions.sql`
- `003_add_settings_table.sql`
- `004_fix_boolean_columns.sql`

### Verify Schema

To check if the `is_system` column exists:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'categories' 
ORDER BY ordinal_position;
```

You should see `is_system` with type `boolean`.

### Check Boolean Columns

To verify boolean columns were fixed:

```sql
-- Check accounts table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'accounts' 
  AND column_name = 'include_in_totals';

-- Check credit_cards table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'credit_cards' 
  AND column_name = 'include_in_totals';
```

Both should show `data_type = 'boolean'`.

### Manual Migration (If Needed)

If migrations didn't run automatically, you can run them manually:

1. Set your database URL:
   ```bash
   export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'
   ```

2. Run the migration script:
   ```bash
   cd budget-app
   ./scripts/run-migrations.sh
   ```

### Check Schema with Script

Use the schema checker script:

```bash
export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'
./scripts/check-schema.sh
```

## Other Common Issues

### Import Defaults Fails

**Symptoms:**
- Error importing categories, accounts, or credit cards
- PGRST204 or PGRST205 errors

**Solutions:**
1. Reload schema cache (see above)
2. Verify migrations ran (see above)
3. Check GitHub Actions logs for migration errors
4. Manually run migrations if needed

### Boolean Type Errors

**Symptoms:**
- Errors about comparing boolean and number types
- Type errors in TypeScript

**Solutions:**
1. Make sure migration `004_fix_boolean_columns.sql` ran
2. Reload schema cache
3. Clear browser cache and hard refresh (Cmd+Shift+R)

### RLS Policy Errors

**Symptoms:**
- "new row violates row-level security policy"
- Permission denied errors

**Solutions:**
1. Make sure you're logged in
2. Check that RLS policies were created (migration 001)
3. Verify user_id is being set correctly

## Getting Help

If you're still having issues:

1. Check GitHub Actions logs:
   - Go to your repo → Actions tab
   - Click on the latest "Deploy to Production" run
   - Check the "Run database migrations" step

2. Check Supabase logs:
   - Go to Supabase dashboard → Logs
   - Look for errors around the time of deployment

3. Run the schema checker script to see current state:
   ```bash
   ./scripts/check-schema.sh
   ```

