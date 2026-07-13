# AI Integration Setup Instructions

## Issues Found

You're encountering two issues:

1. **Database Migration Not Run**: The `ai_usage_tracking` table doesn't exist
2. **Google Gemini API Quota**: Your API key appears to have a quota limit of 0

## Step 1: Run Database Migration

The AI integration requires database tables to be created. Run the migration:

```bash
# Set your database URL (get from Supabase Dashboard > Settings > Database)
export SUPABASE_DB_URL='postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres'

# Run migrations
./scripts/run-migrations.sh
```

Or manually run the migration in Supabase SQL Editor:
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `migrations/041_add_ai_tables.sql`
3. Paste and run

**After running the migration**, reload the PostgREST schema cache:
- Go to Supabase Dashboard > Settings > API
- Click "Reload Schema" button

## Step 2: Fix Google Gemini API Quota

The error shows your API key has a quota limit of 0. This usually means:

1. **Free Tier Not Enabled**: You need to enable the free tier in Google AI Studio
   - Go to https://aistudio.google.com/
   - Check your API key settings
   - Ensure free tier quotas are enabled

2. **API Key Issues**: Verify your API key:
   - Go to https://aistudio.google.com/app/apikey
   - Make sure the key is active
   - Check quota limits in the dashboard

3. **Stay on Free Tier (billing)**: Google does **not** charge only after you exceed
   free rate limits. Behavior is project-based:
   - **Free Tier project** (no billing linked): models marked "Free of charge" cost $0;
     exceeding RPM/RPD/TPM returns `429`, it does not start billing.
   - **Paid Tier project** (billing linked): **every token is charged** from the first
     request — there is no free allowance inside a paid project ([Google forum confirmation](https://discuss.ai.google.dev/t/clarification-on-gemini-api-free-tier-vs-paid-tier-after-billing-activation/96995)).
   - Check the project’s Billing Tier in [Google AI Studio](https://aistudio.google.com/).
     To stay free, use an API key from a project that still shows Free (not Tier 1+).

4. **Model Selection (Free Tier)**: Use stable Flash models that list **Free of charge**
   on [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing):
   - `gemini-3.5-flash` — reasoning (chat, insights, merchant suggestions)
   - `gemini-3.1-flash-lite` — fast tasks (transaction categorization)
   - Avoid `gemini-2.5-pro` (very expensive if the project is paid)
   - Avoid `gemini-2.5-flash` / `gemini-2.5-flash-lite` — many keys get
     404 "no longer available to new users"
   - Prefer stable IDs over `gemini-flash-latest` / `gemini-flash-lite-latest`
     (aliases can hot-swap to preview models)
   - Update in `.env.local` **and** Vercel production env:
     ```
     GEMINI_PRO_MODEL=gemini-3.5-flash
     GEMINI_FLASH_MODEL=gemini-3.1-flash-lite
     ```

## Step 3: Verify Setup

After fixing both issues:

1. **Check Database**: Verify tables exist
   ```bash
   ./scripts/check-schema.sh | grep ai_
   ```

2. **Test API Key**: The app will now show better error messages if quota issues persist

3. **Check Logs**: Monitor the terminal for any remaining errors

## Troubleshooting

### If migration fails:
- Check database connection string
- Verify you have permissions to create tables
- Check Supabase logs for detailed errors

### If API quota still shows 0:
- Create a new API key in Google AI Studio
- Make sure you're using the correct project
- Check billing/quota settings in Google Cloud Console
- Try a different model (see Step 2.3)

### If tables exist but still getting errors:
- Reload PostgREST schema cache (see Step 1)
- Restart your Next.js dev server
- Clear browser cache

## Current Status

The code now handles missing tables gracefully (won't crash), but you should still run the migration for full functionality.


