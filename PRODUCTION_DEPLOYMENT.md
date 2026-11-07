# Production Deployment Guide

Production currently stays on Vercel. The Cloud Panel staging implementation, release contract and gated cutover procedure are documented in [Cloud Panel deployment](docs/CLOUD_PANEL_DEPLOYMENT.md). `PRODUCTION_HOST` must remain unset/Vercel until those gates are complete. The historical setup instructions below describe the existing Vercel service.

## 🏗️ Architecture

**Deployment Pipeline:**
1. Push to `main` branch
2. GitHub Actions runs database migrations
3. If migrations succeed → Deploy to Vercel
4. If migrations fail → Stop deployment

## 📋 Prerequisites

- **Supabase Project** - [Create one](https://supabase.com/dashboard)
- **Vercel Account** - [Sign up](https://vercel.com/signup)
- **GitHub Repository** - Code must be in GitHub
- **PostgreSQL Client** - For running migrations locally

## 🚀 Initial Setup

### Step 1: Supabase Setup

1. **Create Supabase project**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Set name, password, region
   - Wait for creation

2. **Get credentials**:
   - **API Settings** (Project Settings > API):
     - Copy `Project URL`
     - Copy `anon public` key
   - **Database URL** (Project Settings > Database):
     - Copy "Connection string" (Connection pooling)
     - Replace `[YOUR-PASSWORD]` with your DB password

3. **Enable Email Auth**:
   - Go to Authentication > Providers
   - Enable "Email" provider

### Step 2: Vercel Setup

1. **Import repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" > "Project"
   - Import your GitHub repo
   - Set root directory to `budget-app`

2. **Add environment variables**:
   - Go to Project Settings > Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Get Vercel credentials**:
   - Account Settings > Tokens → Create token
   - Project Settings → Copy "Project ID" and "Org ID"

### Step 3: GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Value | Source |
|--------|-------|--------|
| `SUPABASE_DB_URL` | `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres` | Supabase > Database > Connection string |
| `VERCEL_TOKEN` | Your token | Vercel > Account Settings > Tokens |
| `VERCEL_ORG_ID` | Your org ID | Vercel > Project Settings |
| `VERCEL_PROJECT_ID` | Your project ID | Vercel > Project Settings |

### Step 4: Run Initial Migration

1. **Install PostgreSQL** (if needed):
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

2. **Set environment variable**:
   ```bash
   export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'
   ```

3. **Run migrations**:
   ```bash
   cd budget-app
   chmod +x scripts/run-migrations.sh
   ./scripts/run-migrations.sh
   ```

4. **Verify** in Supabase SQL Editor

## 🔄 Automated Deployment

Every push to `main`:

```
git push origin main
    ↓
GitHub Actions starts
    ↓
Check for pending migrations
    ↓
💾 Backup database (if migrations pending)
    ↓
Run database migrations
    ↓
✅ Success → Deploy to Vercel
❌ Failure → Stop (fix and retry)
```

### Automatic Backups

- **Backups are automatically created** before running migrations (only when there are pending migrations)
- **Stored as GitHub Actions artifacts** for 90 days
- **Includes metadata** (commit SHA, timestamp, pending migrations)
- **Can be rolled back** using the Rollback Database workflow

See [docs/BACKUP_AND_ROLLBACK.md](docs/BACKUP_AND_ROLLBACK.md) for detailed backup and rollback instructions.

## 📝 Creating Database Migrations

### 1. Create Migration File

```bash
touch migrations/002_add_feature.sql
```

### 2. Write Migration (Idempotent SQL)

```sql
-- Migration: 002_add_feature.sql
-- Description: Add new feature
-- Date: 2025-01-16

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS new_field TEXT;
```

### 3. Test Locally (Optional)

```bash
export SUPABASE_DB_URL='your-connection-string'
./scripts/run-migrations.sh
```

### 4. Deploy

```bash
git add migrations/002_add_feature.sql
git commit -m "Add migration: new feature"
git push origin main
```

GitHub Actions will automatically run the migration and deploy!

## 🔍 Monitoring

### GitHub Actions
- Repository > Actions tab
- View workflow runs and logs

### Vercel
- Dashboard > Your Project > Deployments
- View deployment logs

### Supabase
```sql
SELECT * FROM _migrations ORDER BY executed_at DESC;
```

## 🐛 Troubleshooting

### Migration Fails
1. Check GitHub Actions logs
2. Fix SQL syntax
3. Test locally
4. Push fix

### Deployment Fails
1. Check Vercel logs
2. Verify environment variables
3. Ensure migrations completed

### Connection Issues
1. Verify `SUPABASE_DB_URL`
2. Check password
3. Confirm IP whitelisting (Supabase allows all by default)

## 🎯 Quick Reference

### Commands

```bash
# Run migrations locally
./scripts/run-migrations.sh

# View migration history
psql "$SUPABASE_DB_URL" -c "SELECT * FROM _migrations;"

# Manual Vercel deploy (if needed)
vercel --prod
```

### Environment Variables

**Local** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Vercel**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**GitHub Actions**:
```
SUPABASE_DB_URL=postgresql://...
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

## ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] GitHub secrets configured
- [ ] Initial migration run
- [ ] GitHub Actions workflow committed
- [ ] First deployment successful
- [ ] App accessible at Vercel URL
- [ ] Authentication working
- [ ] Database operations working

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

**Ready to deploy!** Push to `main` and your app will automatically deploy with database migrations! 🚀


