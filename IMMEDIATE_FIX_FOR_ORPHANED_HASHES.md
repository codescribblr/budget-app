# Immediate Fix for Orphaned Import Hashes

## Your Current Situation

You did a backup/restore, which caused `imported_transactions` to become out of sync with your actual transactions. This is causing import failures even though the frontend says "no duplicates".

---

## Quick Fix Option 1: Clear Orphaned Import Hashes (Recommended)

Run this SQL query in your Supabase SQL Editor to clear all orphaned import hashes:

```sql
-- Delete imported_transactions that don't have corresponding transactions
DELETE FROM imported_transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
AND hash NOT IN (
  SELECT DISTINCT hash 
  FROM imported_transactions it
  INNER JOIN transactions t ON it.hash = t.hash
  WHERE it.user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
);
```

**Replace `'your-email@example.com'` with your actual email address.**

This will delete all import hashes that don't have corresponding transactions in your database.

---

## Quick Fix Option 2: Clear ALL Import History (Nuclear Option)

If you want to start fresh with import tracking:

```sql
-- Delete all imported_transactions for your user
DELETE FROM imported_transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

**Replace `'your-email@example.com'` with your actual email address.**

⚠️ **Warning:** This will clear your entire import history. You'll be able to re-import transactions that were previously imported.

---

## After Running the Fix

1. **Refresh your browser** to clear any cached data
2. **Upload your CSV file again**
3. **Frontend will now correctly detect duplicates**
4. **Import should work without errors**

---

## Long-Term Fix (Already Deployed)

The code has been updated to:

1. ✅ **Include `imported_transactions` in backups** - Future backups will include import history
2. ✅ **Restore `imported_transactions` during restore** - Import history stays in sync
3. ✅ **Detect within-file duplicates** - Frontend now catches duplicate transactions in the same CSV

Once you deploy the latest code, this problem won't happen again!

---

## How to Deploy the Fix

The fix is already committed and pushed to your repository. If you're using Vercel:

1. Go to your Vercel dashboard
2. The deployment should happen automatically
3. Wait for deployment to complete
4. Refresh your app

---

## Understanding the Problem

### What Happened

1. You had transactions imported (with hashes in `imported_transactions` table)
2. You created a backup (which backed up `transactions` but NOT `imported_transactions`)
3. You restored the backup (which restored `transactions` but NOT `imported_transactions`)
4. Now `imported_transactions` has old hashes that don't match your current transactions
5. Your CSV file also had duplicate transactions within it (same hash appearing twice)

### Why It Failed

1. Frontend checked database for duplicates → found none (because hashes were orphaned)
2. Frontend showed "no duplicates"
3. You categorized all 150 transactions
4. You clicked "Import"
5. Backend tried to batch insert all 150
6. Database rejected because some transactions had the same hash (within-file duplicates)
7. Import failed, you lost all categorization work 😢

### How It's Fixed Now

1. ✅ Frontend checks for duplicates **within the CSV file**
2. ✅ Frontend checks for duplicates **against the database**
3. ✅ Frontend shows **all duplicates** with yellow highlighting
4. ✅ Backup/restore includes `imported_transactions` table
5. ✅ No more orphaned hashes after restore

---

## Next Steps

1. **Run one of the SQL queries above** to clear orphaned hashes
2. **Wait for Vercel deployment** to complete (or deploy manually)
3. **Upload your CSV again** - duplicates will now be detected correctly
4. **Import should work perfectly!**

---

## Need Help?

If you're not comfortable running SQL queries, you can also:

1. Go to Settings → Data Management
2. Click "Clear All Data" (⚠️ this deletes everything)
3. Restore from your most recent backup
4. The new code will restore `imported_transactions` correctly

But the SQL query is safer - it only clears the orphaned import hashes, not your actual data.

