import { NotificationService } from './notification-service';
import type { NotificationPreferences } from './types';
import { createClient } from '../supabase/server';

const service = new NotificationService();

/**
 * Check if user has notification type enabled for a channel
 */
export async function isNotificationEnabled(
  userId: string,
  notificationTypeId: string,
  channel: 'email' | 'in_app'
): Promise<boolean> {
  const preferences = await service.getUserPreferences(userId, notificationTypeId);
  return channel === 'email' ? preferences.emailEnabled : preferences.inAppEnabled;
}

/**
 * Get user's preference for a specific setting
 */
export async function getNotificationSetting(
  userId: string,
  notificationTypeId: string,
  settingKey: string
): Promise<any> {
  const preferences = await service.getUserPreferences(userId, notificationTypeId);
  return preferences.settings?.[settingKey];
}

/**
 * Create recurring transaction notification helpers
 */
export async function createRecurringTransactionNotification(
  userId: string,
  budgetAccountId: number,
  recurringTransactionId: number,
  type: 'upcoming' | 'insufficient_funds' | 'amount_changed',
  data: {
    merchantName: string;
    expectedAmount: number;
    dueDate?: string;
    daysUntilDue?: number;
    currentBalance?: number;
    shortfall?: number;
    oldAmount?: number;
    newAmount?: number;
  }
): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/recurring-transactions/${recurringTransactionId}`;

  let title: string;
  let message: string;
  let notificationTypeId: string;
  const metadata: Record<string, any> = {
    recurring_transaction_id: recurringTransactionId,
    expected_amount: data.expectedAmount,
  };

  switch (type) {
    case 'upcoming':
      notificationTypeId = 'recurring_transaction_upcoming';
      title = `Upcoming: ${data.merchantName} payment`;
      message = `Your ${data.merchantName} payment of $${data.expectedAmount.toFixed(2)} is due ${data.daysUntilDue === 0 ? 'today' : `in ${data.daysUntilDue} day${data.daysUntilDue === 1 ? '' : 's'}`}.`;
      metadata.due_date = data.dueDate;
      metadata.days_until_due = data.daysUntilDue;
      break;

    case 'insufficient_funds':
      notificationTypeId = 'recurring_transaction_insufficient_funds';
      title = `⚠️ Insufficient funds for ${data.merchantName}`;
      message = `Your ${data.merchantName} payment of $${data.expectedAmount.toFixed(2)} is due soon, but your account balance is only $${data.currentBalance?.toFixed(2) || '0.00'}.`;
      metadata.current_balance = data.currentBalance;
      metadata.shortfall = data.shortfall;
      break;

    case 'amount_changed':
      notificationTypeId = 'recurring_transaction_amount_changed';
      title = `Your ${data.merchantName} payment amount changed`;
      message = `Your ${data.merchantName} payment changed from $${data.oldAmount?.toFixed(2) || '0.00'} to $${data.newAmount?.toFixed(2) || '0.00'}.`;
      metadata.old_amount = data.oldAmount;
      metadata.new_amount = data.newAmount;
      break;
  }

  // Check if scheduled (for upcoming notifications)
  let scheduledFor: Date | undefined;
  if (type === 'upcoming' && data.daysUntilDue !== undefined && data.daysUntilDue > 0) {
    const reminderDays = await getNotificationSetting(
      userId,
      notificationTypeId,
      'reminder_days_before'
    ) || 2;

    // Schedule for reminder_days_before days before due date
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      scheduledFor = new Date(dueDate.getTime() - reminderDays * 24 * 60 * 60 * 1000);
    }
  }

  return service.createNotification({
    userId,
    budgetAccountId,
    notificationTypeId,
    title,
    message,
    actionUrl,
    actionLabel: 'View Transaction',
    metadata,
    scheduledFor,
  });
}

/**
 * Get all notification types
 */
export async function getAllNotificationTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notification_types')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get user's notification preferences (with defaults)
 */
export async function getUserNotificationPreferences(userId: string): Promise<Record<string, NotificationPreferences>> {
  const supabase = await createClient();
  const types = await getAllNotificationTypes();
  const preferences: Record<string, NotificationPreferences> = {};

  // Get user's custom preferences
  const { data: userPrefs } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId);

  const userPrefsMap = new Map(
    (userPrefs || []).map(p => [p.notification_type_id, p])
  );

  // Build preferences map with defaults
  for (const type of types) {
    const userPref = userPrefsMap.get(type.id);
    preferences[type.id] = {
      emailEnabled: userPref?.email_enabled ?? type.default_email_enabled,
      inAppEnabled: userPref?.in_app_enabled ?? type.default_in_app_enabled,
      settings: userPref?.settings || {},
    };
  }

  return preferences;
}



