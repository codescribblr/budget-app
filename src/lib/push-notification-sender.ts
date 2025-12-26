/**
 * Push Notification Sender
 * Sends push notifications to users using Web Push Protocol
 */

import { createServiceRoleClient } from './supabase/server';
import webpush from 'web-push';

// Initialize web-push with VAPID keys
let vapidInitialized = false;

function initializeVAPID() {
  if (vapidInitialized) return true;
  
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@budgetapp.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured. Push notifications will not work.');
    return false;
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  vapidInitialized = true;
  return true;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    notificationId?: number;
    [key: string]: any;
  };
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!initializeVAPID()) {
    return false;
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        tag: payload.tag || 'budget-app-notification',
        data: payload.data || {},
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
      })
    );

    return true;
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    
    // If subscription is invalid (410 Gone), we should remove it
    if (error.statusCode === 410) {
      // Subscription expired or invalid - will be cleaned up by caller
      return false;
    }
    
    return false;
  }
}

/**
 * Send push notification to all subscriptions for a user
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceRoleClient();

  // Get all push subscriptions for user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const invalidSubscriptionIds: number[] = [];

  // Send to all subscriptions
  for (const subscription of subscriptions) {
    const success = await sendPushNotification(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      payload
    );

    if (success) {
      sent++;
    } else {
      failed++;
      invalidSubscriptionIds.push(subscription.id);
    }
  }

  // Remove invalid subscriptions
  if (invalidSubscriptionIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', invalidSubscriptionIds);
  }

  return { sent, failed };
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushNotificationToUser(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
}

