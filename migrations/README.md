# Database Migrations

This folder contains all database migration scripts for the budget application.

## Migration Naming Convention

Migrations are numbered sequentially with the format:

```
XXX_description.sql
```

Where:
- `XXX` is a 3-digit number (001, 002, 003, etc.)
- `description` is a brief description of the migration (use underscores for spaces)

Example: `001_initial_schema.sql`

## Migration Files

| Migration | Description | Date |
|-----------|-------------|------|
| `001_initial_schema.sql` | Initial database schema with all tables and RLS policies | 2025-01-15 |
| `010_add_merchant_category_rules.sql` | Add merchant category rules table for improved auto-categorization | 2025-11-17 |

## How to Create a New Migration

1. **Create a new file** with the next sequential number:
   ```bash
   touch migrations/002_add_new_feature.sql
   ```

2. **Add migration header** with description and date:
   ```sql
   -- Migration: 002_add_new_feature.sql
   -- Description: Add new feature to the database
   -- Date: 2025-01-16
   ```

3. **Write idempotent SQL** (use `IF NOT EXISTS`, `IF EXISTS`, etc.):
   ```sql
   ALTER TABLE categories ADD COLUMN IF NOT EXISTS new_field TEXT;
   ```

4. **Test locally** against your Supabase project:
   - Go to Supabase SQL Editor
   - Run the migration
   - Verify it works

5. **Commit and push** to trigger deployment:
   ```bash
   git add migrations/002_add_new_feature.sql
   git commit -m "Add migration: add new feature"
   git push origin main
   ```

## Running Migrations Manually

If you need to run migrations manually in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run in the SQL Editor
5. Verify the changes

## Migration Best Practices

1. **Always use idempotent operations**:
   - `CREATE TABLE IF NOT EXISTS`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `DROP TABLE IF EXISTS` (for rollbacks)

2. **Never modify existing migrations** - create a new one instead

3. **Test migrations locally first** before pushing to production

4. **Include rollback instructions** in comments if needed:
   ```sql
   -- To rollback: DROP TABLE new_table;
   ```

5. **Keep migrations small and focused** - one logical change per migration

6. **Document breaking changes** clearly in the migration header

## Automated Deployment

Migrations are automatically run during deployment via GitHub Actions:

1. Push to `main` branch
2. GitHub Actions runs all new migrations against Supabase
3. If migrations succeed, Vercel deployment proceeds
4. If migrations fail, deployment is halted

See `.github/workflows/deploy.yml` for the deployment pipeline configuration.

