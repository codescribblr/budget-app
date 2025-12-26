import { createClient, createServiceRoleClient } from '../supabase/server';
import { sendEmail, renderEmailTemplate } from '../email-utils';
import type { NotificationData, NotificationPreferences, Notification } from './types';

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
      .select('email_enabled, in_app_enabled, settings')
      .eq('user_id', userId)
      .eq('notification_type_id', notificationTypeId)
      .single();

    if (userPrefs) {
      return {
        emailEnabled: userPrefs.email_enabled,
        inAppEnabled: userPrefs.in_app_enabled,
        settings: userPrefs.settings || {},
      };
    }

    // Fall back to notification_types defaults
    const { data: notificationType } = await supabase
      .from('notification_types')
      .select('default_email_enabled, default_in_app_enabled')
      .eq('id', notificationTypeId)
      .single();

    if (!notificationType) {
      // Default to enabled if type not found
      return {
        emailEnabled: true,
        inAppEnabled: true,
        settings: {},
      };
    }

    return {
      emailEnabled: notificationType.default_email_enabled,
      inAppEnabled: notificationType.default_in_app_enabled,
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

    // Send email if enabled
    if (preferences.emailEnabled && !emailSent) {
      try {
        await this.sendEmailNotification(notification);
        emailSent = true;
      } catch (error: any) {
        console.error(`Error sending email for notification ${notificationId}:`, error);
        await this.logDelivery(notificationId, 'email', 'failed', error.message);
        // Continue to try in-app even if email fails
      }
    }

    // Create in-app notification if enabled
    if (preferences.inAppEnabled && !inAppCreated) {
      inAppCreated = true;
    }

    // Update notification status
    await supabase
      .from('notifications')
      .update({
        email_sent: emailSent,
        email_sent_at: emailSent ? now : null,
        in_app_created: inAppCreated,
        in_app_created_at: inAppCreated ? now : null,
        sent_at: (emailSent || inAppCreated) ? now : null,
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
    const { data: notificationType } = await supabase
      .from('notification_types')
      .select('id, category')
      .eq('id', notification.notification_type_id)
      .single();

    // Try to render type-specific template, fall back to generic
    let html: string;
    try {
      const templateName = notificationType?.id.replace(/_/g, '-') || 'notification-generic';
      html = renderEmailTemplate(`notifications/${templateName}`, {
        Title: notification.title,
        Message: notification.message,
        ActionURL: notification.action_url || '',
        ActionLabel: notification.action_label || 'View Details',
        UnsubscribeURL: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings/notifications`,
      });
    } catch (error) {
      // Fall back to generic template
      html = renderEmailTemplate('notifications/notification-generic', {
        Title: notification.title,
        Message: notification.message,
        ActionURL: notification.action_url || '',
        ActionLabel: notification.action_label || 'View Details',
        UnsubscribeURL: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings/notifications`,
      });
    }

    await sendEmail(user.email, notification.title, html);
  }

  /**
   * Log delivery attempt
   */
  private async logDelivery(
    notificationId: number,
    channel: 'email' | 'in_app',
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



