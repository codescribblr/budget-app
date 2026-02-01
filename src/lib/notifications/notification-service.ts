import { createClient, createServiceRoleClient } from '../supabase/server';
import { sendEmail, renderEmailTemplate } from '../email-utils';
import type { NotificationData, NotificationPreferences, Notification } from './types';
import { sendPushNotificationToUser } from '../push-notification-sender';
import fs from 'fs';
import path from 'path';

export class NotificationService {
  /**
   * Create and send a notification
   * Checks user preferences and sends via enabled channels
   */
  async createNotification(data: NotificationData): Promise<number> {
    const supabase = await createClient();

    // 1. Get user preferences for this notification type
    const preferences = await this.getUserPreferences(data.userId, data.notificationTypeId);

    // 2. Create notification record
    const notificationData: any = {
      user_id: data.userId,
      budget_account_id: data.budgetAccountId || null,
      notification_type_id: data.notificationTypeId,
      title: data.title,
      message: data.message,
      action_url: data.actionUrl || null,
      action_label: data.actionLabel || null,
      metadata: data.metadata || {},
      scheduled_for: data.scheduledFor ? data.scheduledFor.toISOString() : null,
    };

    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select('id')
      .single();

    if (insertError || !notification) {
      throw new Error(`Failed to create notification: ${insertError?.message || 'Unknown error'}`);
    }

    const notificationId = notification.id;

    // 3. Send via enabled channels (if not scheduled)
    if (!data.scheduledFor || data.scheduledFor <= new Date()) {
      await this.sendNotification(notificationId, preferences);
    }

    return notificationId;
  }

  /**
   * Get user preferences for a notification type
   * Returns defaults from notification_types if user hasn't set preferences
   */
  async getUserPreferences(
    userId: string,
    notificationTypeId: string
  ): Promise<NotificationPreferences> {
    const supabase = await createClient();

    // Check user preferences first
    const { data: userPrefs } = await supabase
      .from('user_notification_preferences')
      .select('email_enabled, in_app_enabled, push_enabled, settings')
      .eq('user_id', userId)
      .eq('notification_type_id', notificationTypeId)
      .single();

    if (userPrefs) {
      return {
        emailEnabled: userPrefs.email_enabled,
        inAppEnabled: userPrefs.in_app_enabled,
        pushEnabled: userPrefs.push_enabled ?? true,
        settings: userPrefs.settings || {},
      };
    }

    // Fall back to notification_types defaults
    const { data: notificationType } = await supabase
      .from('notification_types')
      .select('default_email_enabled, default_in_app_enabled, default_push_enabled')
      .eq('id', notificationTypeId)
      .single();

    if (!notificationType) {
      // Default to enabled if type not found
      return {
        emailEnabled: true,
        inAppEnabled: true,
        pushEnabled: true,
        settings: {},
      };
    }

    return {
      emailEnabled: notificationType.default_email_enabled,
      inAppEnabled: notificationType.default_in_app_enabled,
      pushEnabled: notificationType.default_push_enabled ?? true,
      settings: {},
    };
  }

  /**
   * Send scheduled notifications (called by cron job)
   */
  async sendScheduledNotifications(): Promise<void> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Query notifications where scheduled_for <= now AND sent_at IS NULL
    const { data: scheduledNotifications, error } = await supabase
      .from('notifications')
      .select('id, user_id, notification_type_id')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)
      .is('sent_at', null);

    if (error) {
      console.error('Error fetching scheduled notifications:', error);
      return;
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      return;
    }

    // Send each notification
    for (const notification of scheduledNotifications) {
      try {
        const preferences = await this.getUserPreferences(
          notification.user_id,
          notification.notification_type_id
        );
        await this.sendNotification(notification.id, preferences);
      } catch (error: any) {
        console.error(`Error sending scheduled notification ${notification.id}:`, error);
      }
    }
  }

  /**
   * Send notification via enabled channels
   */
  private async sendNotification(
    notificationId: number,
    preferences: NotificationPreferences
  ): Promise<void> {
    const supabase = await createClient();

    // Load notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (error || !notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    const now = new Date().toISOString();
    let emailSent = notification.email_sent;
    let inAppCreated = notification.in_app_created;
    let pushSent = false;

    // Send email if enabled
    if (preferences.emailEnabled && !emailSent) {
      try {
        await this.sendEmailNotification(notification);
        emailSent = true;
      } catch (error: any) {
        console.error(`Error sending email for notification ${notificationId}:`, error);
        await this.logDelivery(notificationId, 'email', 'failed', error.message);
        // Continue to try other channels even if email fails
      }
    }

    // ALWAYS create in-app notification (bell icon) - this cannot be disabled
    // The in-app notification is the core notification system
    if (!inAppCreated) {
      inAppCreated = true;
    }

    // Send push notification if:
    // 1. User has "in-app" enabled for this notification type (this setting controls push)
    // 2. User has push notifications enabled (has subscribed)
    if (preferences.inAppEnabled) {
      // Check if user has push subscriptions
      const { data: pushSubscriptions, error: pushSubError } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', notification.user_id)
        .limit(1);

      if (pushSubError) {
        console.error(`Error checking push subscriptions for notification ${notificationId}:`, pushSubError);
      }

      const hasPushSubscription = pushSubscriptions && pushSubscriptions.length > 0;

      if (hasPushSubscription) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const actionUrl = notification.action_url || `${baseUrl}/notifications`;
          
          const { sent, failed } = await sendPushNotificationToUser(notification.user_id, {
            title: notification.title,
            body: notification.message,
            icon: `${baseUrl}/icon-192.png`,
            badge: `${baseUrl}/icon-192.png`,
            tag: `notification-${notificationId}`,
            data: {
              url: actionUrl,
              notificationId: notificationId,
            },
          });

          if (sent > 0) {
            pushSent = true;
          }
          
          // Log failed push notifications only if there were failures and no successes
          // (expired subscriptions are handled silently by push-notification-sender)
          if (failed > 0 && sent === 0) {
            await this.logDelivery(notificationId, 'push', 'failed', 'No valid push subscriptions');
          }
        } catch (error: any) {
          // Only log unexpected errors (not 410 expired subscription errors)
          if (!error.message?.includes('410') && !error.statusCode === 410) {
            console.error(`Error sending push notification ${notificationId}:`, error);
            await this.logDelivery(notificationId, 'push', 'failed', error.message);
          }
        }
      }
    }

    // Update notification status
    await supabase
      .from('notifications')
      .update({
        email_sent: emailSent,
        email_sent_at: emailSent ? now : null,
        in_app_created: inAppCreated,
        in_app_created_at: inAppCreated ? now : null,
        sent_at: (emailSent || inAppCreated || pushSent) ? now : null,
        updated_at: now,
      })
      .eq('id', notificationId);

    // Log successful deliveries
    if (emailSent) {
      await this.logDelivery(notificationId, 'email', 'sent');
    }
    if (inAppCreated) {
      await this.logDelivery(notificationId, 'in_app', 'sent');
    }
    if (pushSent) {
      await this.logDelivery(notificationId, 'push', 'sent');
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    // Use service role client to get user email
    const adminSupabase = createServiceRoleClient();

    // Get user email
    const { data: { user }, error: userError } = await adminSupabase.auth.admin.getUserById(
      notification.user_id
    );

    if (userError || !user?.email) {
      throw new Error(`User not found or no email: ${notification.user_id}`);
    }

    // Get notification type for template selection
    const { data: notificationType } = await adminSupabase
      .from('notification_types')
      .select('id, category')
      .eq('id', notification.notification_type_id)
      .single();

    // Try to render type-specific template, fall back to generic
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Use data URI in development (localhost URLs don't work in emails)
    // Use hosted URL in production for better email client compatibility
    let logoUrl: string;
    if (process.env.NODE_ENV === 'development' || baseUrl.includes('localhost')) {
      // In development, embed as base64 data URI since localhost URLs won't work
      try {
        const logoPath = path.join(process.cwd(), 'public', 'icon-192.png');
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        logoUrl = `data:image/png;base64,${logoBase64}`;
      } catch (error) {
        console.error('Failed to load logo for email:', error);
        // Fallback: use a placeholder or empty string
        logoUrl = '';
      }
    } else {
      // In production, use hosted URL
      logoUrl = `${baseUrl}/icon-192.png`;
    }
    
    let html: string;
    try {
      const templateName = notificationType?.id.replace(/_/g, '-') || 'notification-generic';
      html = renderEmailTemplate(`notifications/${templateName}`, {
        Title: notification.title,
        Message: notification.message,
        ActionURL: notification.action_url || '',
        ActionLabel: notification.action_label || 'View Details',
        UnsubscribeURL: `${baseUrl}/settings/notifications`,
        LogoURL: logoUrl,
      });
    } catch (error) {
      // Fall back to generic template
      html = renderEmailTemplate('notifications/notification-generic', {
        Title: notification.title,
        Message: notification.message,
        ActionURL: notification.action_url || '',
        ActionLabel: notification.action_label || 'View Details',
        UnsubscribeURL: `${baseUrl}/settings/notifications`,
        LogoURL: logoUrl,
      });
    }

    await sendEmail(user.email, notification.title, html);
  }

  /**
   * Log delivery attempt
   */
  private async logDelivery(
    notificationId: number,
    channel: 'email' | 'in_app' | 'push',
    status: 'pending' | 'sent' | 'failed' | 'skipped',
    errorMessage?: string
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('notification_delivery_log').insert({
      notification_id: notificationId,
      channel,
      status,
      error_message: errorMessage || null,
      delivered_at: status === 'sent' ? new Date().toISOString() : null,
    });
  }
}




