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

3. **Model Availability**: The model `gemini-2.0-flash-exp` might not be available in your region
   - Try using `gemini-1.5-flash` or `gemini-1.5-pro` instead
   - Update in `.env.local`:
     ```
     GEMINI_PRO_MODEL=gemini-1.5-pro
     GEMINI_FLASH_MODEL=gemini-1.5-flash
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


