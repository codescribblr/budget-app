# Google OAuth Setup Guide

This guide will walk you through setting up Google sign-in/sign-up for your Budget App.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A Supabase project
- Your app deployed or running locally

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing project
   - Give it a name (e.g., "Budget App")

3. **Enable Google+ API**
   - In the left sidebar, go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
   - Also search for "Google Identity Services API" and enable it

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" (unless you have a Google Workspace account)
     - Fill in the required fields:
       - App name: Budget App
       - User support email: your email
       - Developer contact: your email
     - Add scopes: `email`, `profile`, `openid`
     - Add test users (for development) or publish the app (for production)
   - Back in Credentials, select "Web application"
   - Name it (e.g., "Budget App Web Client")
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/auth/callback`
     - For production: `https://yourdomain.com/auth/callback`
     - **Important**: Also add your Supabase project's callback URL:
       - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   - Click "Create"
   - **Save the Client ID and Client Secret** - you'll need these!

## Step 2: Configure Supabase

1. **Go to Supabase Dashboard**
   - Visit [Supabase Dashboard](https://app.supabase.com/)
   - Select your project

2. **Enable Google Provider**
   - Go to "Authentication" > "Providers" in the left sidebar
   - Find "Google" in the list
   - Toggle it to "Enabled"

3. **Add Google Credentials**
   - Paste your Google Client ID into the "Client ID (for OAuth)" field
   - Paste your Google Client Secret into the "Client Secret (for OAuth)" field
   - Click "Save"

4. **Configure Redirect URLs**
   - In the same Google provider settings, verify the redirect URL matches:
     - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   - This should be automatically set by Supabase

## Step 3: Update Environment Variables

Add these to your `.env.local` file (they may already exist):

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id-here
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret-here
```

**Note**: These environment variables are optional for the frontend - Supabase handles the OAuth flow. However, if you need them for other Google APIs, keep them in your `.env.local`.

## Step 4: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Test Google Sign-In**
   - Go to `/login` or `/signup`
   - Click the "Continue with Google" button
   - You should be redirected to Google's sign-in page
   - After signing in, you'll be redirected back to your app

3. **Verify User Creation**
   - Check your Supabase dashboard > Authentication > Users
   - You should see the new user created with Google as the provider

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure you've added both your app's callback URL AND Supabase's callback URL to Google Cloud Console
- The Supabase callback URL format is: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

### "Access blocked" error
- If your app is in testing mode, make sure the user's email is added as a test user in Google Cloud Console
- Or publish your OAuth consent screen for production use

### User not created in Supabase
- Check Supabase logs: Dashboard > Logs > Auth Logs
- Verify the Google provider is enabled in Supabase
- Check that the Client ID and Secret are correct

### Callback not working
- Verify your callback route at `/auth/callback` is working
- Check that the redirect URL in Google Cloud Console matches your app's URL
- For production, make sure you're using HTTPS

## Production Checklist

Before going to production:

- [ ] OAuth consent screen is published (not in testing mode)
- [ ] Production redirect URLs are added to Google Cloud Console
- [ ] Supabase production project has Google provider enabled
- [ ] Environment variables are set in your hosting platform (Vercel, etc.)
- [ ] Test the flow on your production domain

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase OAuth Providers Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
