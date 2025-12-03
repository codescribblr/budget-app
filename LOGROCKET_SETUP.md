# LogRocket Setup Guide

This guide will help you set up LogRocket for user flow tracking and analytics in your budget app.

## What is LogRocket?

LogRocket is a session replay and analytics tool that helps you:
- Track user flows and behavior
- Debug issues by watching user sessions
- Monitor performance and errors
- Understand how users interact with your application

## Setup Steps

### 1. Create a LogRocket Account

1. Go to [https://logrocket.com](https://logrocket.com)
2. Sign up for an account (they offer a free tier)
3. Create a new project for your budget app

### 2. Get Your App ID

After creating a project, LogRocket will provide you with an App ID. It will look something like:
```
abc123/your-app-name
```

### 3. Configure Environment Variables

Add the LogRocket App ID to your environment variables:

**For local development (.env.local):**
```bash
NEXT_PUBLIC_LOGROCKET_APP_ID=your-app-id-here
NEXT_PUBLIC_LOGROCKET_ENABLED=true  # Optional: enable for local dev
```

**For production (Vercel/environment):**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `NEXT_PUBLIC_LOGROCKET_APP_ID` = `your-app-id-here`
   - (No need for `NEXT_PUBLIC_LOGROCKET_ENABLED` in production - it auto-enables)

### 4. How It Works

The LogRocket integration is automatically initialized when:
- The app is in production mode, OR
- `NEXT_PUBLIC_LOGROCKET_ENABLED=true` is set

**Features:**
- ✅ Automatic user identification (email, name, user ID)
- ✅ Session replay recording
- ✅ Console error/warning capture
- ✅ Network request monitoring (with sensitive data sanitized)
- ✅ Automatic user tracking on login/logout

### 5. Privacy & Security

The integration includes privacy protections:
- Sensitive headers (authorization, cookies) are automatically removed from network requests
- Input sanitization is enabled by default
- User data is only sent to LogRocket (not stored locally)

### 6. Testing

To test LogRocket locally:
1. Set `NEXT_PUBLIC_LOGROCKET_ENABLED=true` in `.env.local`
2. Restart your dev server
3. Log in to your app
4. Perform some actions
5. Check your LogRocket dashboard to see the session

### 7. Viewing Sessions

1. Log in to your LogRocket dashboard
2. Navigate to your project
3. You'll see:
   - Live sessions as users interact with your app
   - Recorded sessions for playback
   - User identification and metadata
   - Console errors and network requests

## Troubleshooting

**LogRocket not initializing:**
- Check that `NEXT_PUBLIC_LOGROCKET_APP_ID` is set correctly
- Verify the App ID format matches: `abc123/your-app-name`
- Check browser console for initialization errors

**User identification not working:**
- Ensure users are logged in (LogRocket identifies users on auth state change)
- Check that Supabase auth is working correctly

**Not seeing sessions:**
- Verify you're in production mode or `NEXT_PUBLIC_LOGROCKET_ENABLED=true` is set
- Check browser console for any errors
- Ensure your LogRocket project is active

## Additional Configuration

You can customize LogRocket behavior by editing:
- `src/components/providers/logrocket-provider.tsx`

Common customizations:
- Adjust which console levels to capture
- Modify network request sanitization
- Add custom user metadata
- Configure session sampling (to reduce costs)

## Cost Considerations

LogRocket offers:
- **Free tier**: Limited sessions per month
- **Paid plans**: Based on session volume

Consider enabling session sampling for high-traffic apps to reduce costs while still capturing valuable insights.

