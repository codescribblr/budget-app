# Push Notifications Setup Guide

This guide explains how to set up push notifications for your Budget App PWA.

## Overview

Push notifications allow users to receive notifications on their mobile devices (Android/iOS) even when the app is closed. This works when users "Add to Home Screen" to install your app as a PWA.

## Prerequisites

1. **HTTPS Required**: Push notifications require HTTPS in production (localhost works for development)
2. **Service Worker**: Already implemented at `/public/sw.js`
3. **VAPID Keys**: Need to generate and configure VAPID keys for authentication

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to authenticate your server when sending push notifications.

**Important**: Generate these keys ONCE and use the SAME keys for all environments (development, staging, production). This ensures push subscriptions work across all environments.

### Option 1: Using the Project Script (Recommended)

```bash
# Make sure web-push is installed
npm install web-push

# Generate VAPID keys
node scripts/generate-vapid-keys.js
```

This will output the keys in a format ready to copy into your environment variables.

### Option 2: Using web-push CLI

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output something like:
```
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa40HI8F8nB7N8k8...
Private Key:
...
```

## Step 2: Configure Environment Variables

### For Local Development

Add the VAPID keys to your `.env.local` file:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:your-email@example.com
```

### For Vercel Production

1. **Go to your Vercel project dashboard**
   - Navigate to: `https://vercel.com/your-username/your-project/settings/environment-variables`

2. **Add Environment Variables**
   - Click "Add New"
   - Add each variable:
     - **Key**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
     - **Value**: Your public key (from Step 1)
     - **Environment**: Production, Preview, Development (select all)
   
     - **Key**: `VAPID_PRIVATE_KEY`
     - **Value**: Your private key (from Step 1)
     - **Environment**: Production, Preview, Development (select all)
     - ⚠️ **Important**: Mark this as "Sensitive" if Vercel has that option
   
     - **Key**: `VAPID_EMAIL`
     - **Value**: `mailto:your-email@yourdomain.com`
     - **Environment**: Production, Preview, Development (select all)

3. **Redeploy**
   - After adding environment variables, Vercel will automatically redeploy
   - Or manually trigger a redeploy from the Deployments page

**Important Notes:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is exposed to the client (safe to expose)
- `VAPID_PRIVATE_KEY` must be kept secret (server-side only)
- `VAPID_EMAIL` should be a `mailto:` URL (e.g., `mailto:admin@yourdomain.com`)
- **Use the SAME keys for all environments** - this ensures push subscriptions work across dev/staging/production

## Step 3: Run Database Migration

Run the migration to create the push subscriptions table:

```bash
./scripts/run-migrations.sh
```

Or manually run:
```bash
psql $SUPABASE_DB_URL -f migrations/061_add_push_subscriptions.sql
```

## Step 5: Update Next.js Config (if needed)

Ensure your `next.config.ts` allows the service worker to be served:

```typescript
const nextConfig: NextConfig = {
  // Service worker is already accessible at /sw.js from public directory
};
```

## Step 6: Test Push Notifications

1. **Enable Push Notifications**:
   - Go to `/settings/notifications`
   - Click "Enable Push Notifications"
   - Grant permission when prompted

2. **Add to Home Screen** (for mobile):
   - **iOS Safari**: Share → "Add to Home Screen"
   - **Android Chrome**: Menu → "Add to Home Screen"

3. **Test Notification**:
   - Go to `/test/notifications`
   - Create a test notification
   - You should receive a push notification even if the app is closed

## How It Works

1. **User enables push notifications** → Service worker registers, subscription created
2. **Subscription saved** → Stored in `push_subscriptions` table
3. **Notification created** → Notification service checks if push is enabled
4. **Push sent** → Server sends push notification using web-push library
5. **Device receives** → Service worker handles push event and displays notification
6. **User clicks** → Service worker opens the app to the notification URL

## Browser Support

- ✅ **Chrome/Edge** (Android & Desktop): Full support
- ✅ **Firefox** (Android & Desktop): Full support
- ✅ **Safari** (iOS 16.4+): Full support
- ❌ **Safari** (Desktop): Limited support (no push when app closed)
- ❌ **Safari** (iOS < 16.4): No support

## Troubleshooting

### Push notifications not working?

1. **Check HTTPS**: Must be HTTPS in production (or localhost for dev)
2. **Check VAPID keys**: Ensure they're correctly set in environment variables
3. **Check service worker**: Open DevTools → Application → Service Workers
4. **Check subscription**: Verify subscription exists in `push_subscriptions` table
5. **Check browser console**: Look for errors in service worker logs

### Permission denied?

- User must grant notification permission
- On iOS, user must add app to home screen first
- Some browsers require user interaction to request permission

### Subscription expired?

- Subscriptions can expire (especially on iOS)
- The system automatically removes invalid subscriptions
- User may need to re-enable push notifications

## Security Considerations

1. **VAPID Private Key**: Never expose in client-side code
2. **Subscription Endpoints**: Store securely, validate user ownership
3. **Rate Limiting**: Consider rate limiting push notifications
4. **User Privacy**: Only send notifications user has opted into

## API Endpoints

- `POST /api/push/subscribe` - Save push subscription
- `POST /api/push/unsubscribe` - Remove push subscription

## Files Created

- `public/sw.js` - Service worker for push notifications
- `src/lib/push-notifications.ts` - Client-side push utilities
- `src/lib/push-notification-sender.ts` - Server-side push sender
- `src/components/notifications/PushNotificationSetup.tsx` - UI component
- `migrations/061_add_push_subscriptions.sql` - Database migration


