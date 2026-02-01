/**
 * Admin Notifications Service
 * Handles creation, sending, and management of admin notifications
 */

import { createClient, createServiceRoleClient } from './supabase/server';
import { sendPushNotificationToUser } from './push-notification-sender';

export interface AdminNotification {
  id: number;
  createdBy: string | null;
  title: string;
  content: string;
  pushTitle: string | null;
  pushBody: string | null;
  targetType: 'global' | 'account' | 'user';
  targetId: string | null;
  sendEmail: boolean;
  status: 'draft' | 'sent';
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationRecipient {
  id: number;
  adminNotificationId: number;
  userId: string;
  budgetAccountId: number | null;
  notificationId: number | null;
  pushSent: boolean;
  pushSentAt: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CreateAdminNotificationData {
  title: string;
  content: string;
  pushTitle?: string | null;
  pushBody?: string | null;
  targetType: 'global' | 'account' | 'user';
  targetId?: string | null;
  sendEmail?: boolean;
}

export interface AdminNotificationStats {
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  pushSentCount: number;
}

/**
 * Create a new admin notification (draft)
 */
export async function createAdminNotification(
  createdBy: string,
  data: CreateAdminNotificationData
): Promise<number> {
  const supabase = await createClient();

  const { data: notification, error } = await supabase
    .from('admin_notifications')
    .insert({
      created_by: createdBy,
      title: data.title,
      content: data.content,
      push_title: data.pushTitle || null,
      push_body: data.pushBody || null,
      target_type: data.targetType,
      target_id: data.targetId || null,
      send_email: data.sendEmail !== undefined ? data.sendEmail : true,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !notification) {
    throw new Error(`Failed to create admin notification: ${error?.message || 'Unknown error'}`);
  }

  return notification.id;
}

/**
 * Update an admin notification
 */
export async function updateAdminNotification(
  id: number,
  data: Partial<CreateAdminNotificationData>
): Promise<void> {
  const supabase = await createClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.pushTitle !== undefined) updateData.push_title = data.pushTitle;
  if (data.pushBody !== undefined) updateData.push_body = data.pushBody;
  if (data.targetType !== undefined) updateData.target_type = data.targetType;
  if (data.targetId !== undefined) updateData.target_id = data.targetId;
  if (data.sendEmail !== undefined) updateData.send_email = data.sendEmail;

  const { error } = await supabase
    .from('admin_notifications')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update admin notification: ${error.message}`);
  }
}

/**
 * Get admin notification by ID
 */
export async function getAdminNotification(id: number): Promise<AdminNotification | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch admin notification: ${error.message}`);
  }

  return {
    id: data.id,
    createdBy: data.created_by,
    title: data.title,
    content: data.content,
    pushTitle: data.push_title,
    pushBody: data.push_body,
    targetType: data.target_type,
    targetId: data.target_id,
    sendEmail: data.send_email ?? true,
    status: data.status,
    sentAt: data.sent_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * List admin notifications
 */
export async function listAdminNotifications(options?: {
  status?: 'draft' | 'sent';
  limit?: number;
  offset?: number;
}): Promise<AdminNotification[]> {
  const supabase = await createClient();

  let query = supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list admin notifications: ${error.message}`);
  }

  return (data || []).map((n: any) => ({
    id: n.id,
    createdBy: n.created_by,
    title: n.title,
    content: n.content,
    pushTitle: n.push_title,
    pushBody: n.push_body,
    targetType: n.target_type,
    targetId: n.target_id,
    sendEmail: n.send_email ?? true,
    status: n.status,
    sentAt: n.sent_at,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));
}

/**
 * Get recipients for an admin notification
 */
export async function getAdminNotificationRecipients(
  adminNotificationId: number
): Promise<AdminNotificationRecipient[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_notification_recipients')
    .select('*')
    .eq('admin_notification_id', adminNotificationId)
    .order('created_at', { ascending: false });

  if (error) {
    // Log error but don't throw - return empty array instead
    console.warn(`Failed to fetch recipients for admin notification ${adminNotificationId}:`, error.message);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    adminNotificationId: r.admin_notification_id,
    userId: r.user_id,
    budgetAccountId: r.budget_account_id,
    notificationId: r.notification_id,
    pushSent: r.push_sent,
    pushSentAt: r.push_sent_at,
    isRead: r.is_read,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

/**
 * Get statistics for an admin notification
 */
export async function getAdminNotificationStats(
  adminNotificationId: number
): Promise<AdminNotificationStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_notification_recipients')
    .select('is_read, push_sent')
    .eq('admin_notification_id', adminNotificationId);

  if (error) {
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const recipients = data || [];
  const totalRecipients = recipients.length;
  const readCount = recipients.filter((r: any) => r.is_read).length;
  const unreadCount = totalRecipients - readCount;
  const pushSentCount = recipients.filter((r: any) => r.push_sent).length;

  return {
    totalRecipients,
    readCount,
    unreadCount,
    pushSentCount,
  };
}

/**
 * Send an admin notification to all target recipients
 */
export async function sendAdminNotification(adminNotificationId: number): Promise<{
  totalRecipients: number;
  successful: number;
  failed: number;
}> {
  const supabase = createServiceRoleClient();

  // Get the admin notification
  const adminNotification = await getAdminNotification(adminNotificationId);
  if (!adminNotification) {
    throw new Error('Admin notification not found');
  }

  if (adminNotification.status === 'sent') {
    throw new Error('Notification has already been sent');
  }

  // Determine target user IDs
  let targetUserIds: string[] = [];

  if (adminNotification.targetType === 'global') {
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }
    targetUserIds = users.users.map((u) => u.id);
  } else if (adminNotification.targetType === 'account') {
    if (!adminNotification.targetId) {
      throw new Error('Account ID is required for account-targeted notifications');
    }
    const accountId = parseInt(adminNotification.targetId);
    if (isNaN(accountId)) {
      throw new Error('Invalid account ID');
    }

    // Get all users in the account
    const { data: accountUsers } = await supabase
      .from('account_users')
      .select('user_id')
      .eq('account_id', accountId)
      .eq('status', 'active');

    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    const userIds = new Set<string>();
    if (account?.owner_id) {
      userIds.add(account.owner_id);
    }
    (accountUsers || []).forEach((au: any) => {
      userIds.add(au.user_id);
    });

    targetUserIds = Array.from(userIds);
  } else if (adminNotification.targetType === 'user') {
    if (!adminNotification.targetId) {
      throw new Error('User ID is required for user-targeted notifications');
    }
    targetUserIds = [adminNotification.targetId];
  }

  // Create notification records and send to each user
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/notifications`;

  const recipientRecords: any[] = [];
  let successful = 0;
  let failed = 0;

  for (const userId of targetUserIds) {
    try {
      // Get user preferences for system_notification type (get both email and in_app)
      const { data: userPrefs } = await supabase
        .from('user_notification_preferences')
        .select('email_enabled, in_app_enabled')
        .eq('user_id', userId)
        .eq('notification_type_id', 'system_notification')
        .single();

      // Default to enabled if no preference set
      const inAppEnabled = userPrefs?.in_app_enabled ?? true;

      // Create notification record directly using service role client to bypass RLS
      const notificationData: any = {
        user_id: userId,
        budget_account_id: adminNotification.targetType === 'account' && adminNotification.targetId
          ? parseInt(adminNotification.targetId)
          : null,
        notification_type_id: 'system_notification',
        title: adminNotification.title,
        message: adminNotification.content, // HTML content
        action_url: actionUrl,
        action_label: null,
        metadata: {
          admin_notification_id: adminNotificationId,
          is_html: true,
        },
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
      const now = new Date().toISOString();

      // Update action_url to point to the specific notification detail page
      const notificationDetailUrl = `${baseUrl}/notifications/${notificationId}`;

      // Determine budget_account_id if account-targeted
      let budgetAccountId: number | null = null;
      if (adminNotification.targetType === 'account' && adminNotification.targetId) {
        budgetAccountId = parseInt(adminNotification.targetId);
      }

      // Check if email should be sent:
      // 1. Admin notification has sendEmail enabled
      // 2. User has email enabled for system notifications
      const shouldSendEmail = adminNotification.sendEmail && 
        (userPrefs?.email_enabled ?? true);

      let emailSent = false;
      let emailSentAt: string | null = null;

      // Send email if enabled
      if (shouldSendEmail) {
        try {
          const emailUtils = await import('./email-utils');
          const fs = await import('fs');
          const path = await import('path');
          
          // Get user email
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
          if (userError || !user?.email) {
            throw new Error(`User not found or no email: ${userId}`);
          }

          // Get notification type for template selection
          const { data: notificationType } = await supabase
            .from('notification_types')
            .select('id, category')
            .eq('id', 'system_notification')
            .single();

          // Prepare logo URL
          let logoUrl: string;
          if (process.env.NODE_ENV === 'development' || baseUrl.includes('localhost')) {
            try {
              const logoPath = path.join(process.cwd(), 'public', 'icon-192.png');
              const logoBuffer = fs.readFileSync(logoPath);
              const logoBase64 = logoBuffer.toString('base64');
              logoUrl = `data:image/png;base64,${logoBase64}`;
            } catch (error) {
              logoUrl = '';
            }
          } else {
            logoUrl = `${baseUrl}/icon-192.png`;
          }

          // Render email template
          let html: string;
          try {
            const templateName = notificationType?.id.replace(/_/g, '-') || 'notification-generic';
            html = emailUtils.renderEmailTemplate(`notifications/${templateName}`, {
              Title: adminNotification.title,
              Message: adminNotification.content,
              ActionURL: notificationDetailUrl,
              ActionLabel: 'View Notification',
              UnsubscribeURL: `${baseUrl}/settings/notifications`,
              LogoURL: logoUrl,
            });
          } catch (error) {
            html = emailUtils.renderEmailTemplate('notifications/notification-generic', {
              Title: adminNotification.title,
              Message: adminNotification.content,
              ActionURL: notificationDetailUrl,
              ActionLabel: 'View Notification',
              UnsubscribeURL: `${baseUrl}/settings/notifications`,
              LogoURL: logoUrl,
            });
          }

          await emailUtils.sendEmail(user.email, adminNotification.title, html);
          emailSent = true;
          emailSentAt = now;
        } catch (error: any) {
          console.error(`Error sending email for notification ${notificationId}:`, error);
          // Continue even if email fails
        }
      }

      // Mark notification as created (in-app notification is always created)
      // Also update action_url to point to the notification detail page
      await supabase
        .from('notifications')
        .update({
          action_url: notificationDetailUrl,
          email_sent: emailSent,
          email_sent_at: emailSentAt,
          in_app_created: true,
          in_app_created_at: now,
          sent_at: now,
          updated_at: now,
        })
        .eq('id', notificationId);

      // Send push notification if enabled
      // If custom push fields are provided, use them; otherwise use default message
      let pushSent = false;
      let pushSentAt: string | null = null;

      if (inAppEnabled) {
        const pushTitle = adminNotification.pushTitle || adminNotification.title;
        const pushBody = adminNotification.pushBody || 'You have new notifications';

        const { sent } = await sendPushNotificationToUser(userId, {
          title: pushTitle,
          body: pushBody,
          icon: `${baseUrl}/icon-192.png`,
          badge: `${baseUrl}/icon-192.png`,
          tag: `admin-notification-${adminNotificationId}`,
          data: {
            url: actionUrl,
            notificationId: notificationId,
            adminNotificationId: adminNotificationId,
          },
        });

        if (sent > 0) {
          pushSent = true;
          pushSentAt = new Date().toISOString();
        }
      }

      recipientRecords.push({
        admin_notification_id: adminNotificationId,
        user_id: userId,
        budget_account_id: budgetAccountId,
        notification_id: notificationId,
        push_sent: pushSent,
        push_sent_at: pushSentAt,
        is_read: false,
      });
      successful++;
    } catch (error: any) {
      console.error(`Error sending notification to user ${userId}:`, error);
      failed++;
      // Continue with other users
    }
  }

  // Insert recipient records
  if (recipientRecords.length > 0) {
    const { error: insertError } = await supabase
      .from('admin_notification_recipients')
      .insert(recipientRecords);

    if (insertError) {
      throw new Error(`Failed to create recipient records: ${insertError.message}`);
    }
  }

  // Update admin notification status
  const { error: updateError } = await supabase
    .from('admin_notifications')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminNotificationId);

  if (updateError) {
    throw new Error(`Failed to update admin notification status: ${updateError.message}`);
  }

  // Update read status from notifications table periodically
  // This will be handled by a sync function or on-demand query

  return {
    totalRecipients: targetUserIds.length,
    successful,
    failed,
  };
}

/**
 * Delete an admin notification (only if draft)
 */
export async function deleteAdminNotification(id: number): Promise<void> {
  const supabase = await createClient();

  // Check if notification is draft
  const notification = await getAdminNotification(id);
  if (!notification) {
    throw new Error('Admin notification not found');
  }

  if (notification.status === 'sent') {
    throw new Error('Cannot delete a notification that has been sent');
  }

  const { error } = await supabase
    .from('admin_notifications')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete admin notification: ${error.message}`);
  }
}

/**
 * Sync read status from notifications table to admin_notification_recipients
 */
export async function syncAdminNotificationReadStatus(adminNotificationId: number): Promise<void> {
  const supabase = createServiceRoleClient();

  // Get all recipients
  const recipients = await getAdminNotificationRecipients(adminNotificationId);

  // Update read status from notifications table
  for (const recipient of recipients) {
    if (recipient.notificationId) {
      const { data: notification } = await supabase
        .from('notifications')
        .select('is_read, read_at')
        .eq('id', recipient.notificationId)
        .single();

      if (notification) {
        await supabase
          .from('admin_notification_recipients')
          .update({
            is_read: notification.is_read,
            read_at: notification.read_at,
          })
          .eq('id', recipient.id);
      }
    }
  }
}
