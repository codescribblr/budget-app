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
  type: 'upcoming' | 'insufficient_funds' | 'amount_changed' | 'missed',
  data: {
    merchantName: string;
    expectedAmount: number;
    dueDate?: string;
    expectedDate?: string;
    daysUntilDue?: number;
    currentBalance?: number;
    shortfall?: number;
    oldAmount?: number;
    newAmount?: number;
    dedupeKey?: string;
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
      metadata.dedupe_key = data.dedupeKey;
      break;

    case 'insufficient_funds':
      notificationTypeId = 'recurring_transaction_insufficient_funds';
      title = `⚠️ Insufficient funds for ${data.merchantName}`;
      message = `Your ${data.merchantName} payment of $${data.expectedAmount.toFixed(2)} is due soon, but your account balance is only $${data.currentBalance?.toFixed(2) || '0.00'}.`;
      metadata.current_balance = data.currentBalance;
      metadata.shortfall = data.shortfall;
      metadata.due_date = data.dueDate;
      metadata.dedupe_key = data.dedupeKey;
      break;

    case 'amount_changed':
      notificationTypeId = 'recurring_transaction_amount_changed';
      title = `Your ${data.merchantName} payment amount changed`;
      message = `Your ${data.merchantName} payment changed from $${data.oldAmount?.toFixed(2) || '0.00'} to $${data.newAmount?.toFixed(2) || '0.00'}.`;
      metadata.old_amount = data.oldAmount;
      metadata.new_amount = data.newAmount;
      metadata.dedupe_key = data.dedupeKey;
      break;

    case 'missed':
      notificationTypeId = 'recurring_transaction_missed';
      title = `Missed: ${data.merchantName} payment`;
      message = `Your expected ${data.merchantName} payment of $${data.expectedAmount.toFixed(2)} was not received.`;
      metadata.expected_date = data.expectedDate;
      metadata.dedupe_key = data.dedupeKey;
      break;
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
  });
}

export interface NewRecurringPatternItem {
  recurringTransactionId: number;
  merchantName: string;
  expectedAmount: number;
  frequency: string;
  confidenceScore: number;
}

/**
 * Send a grouped notification for newly detected recurring transaction patterns.
 * Used for automatic detection only — manual detect runs skip this.
 */
export async function createGroupedNewRecurringPatternsNotification(
  userId: string,
  budgetAccountId: number,
  patterns: NewRecurringPatternItem[]
): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/recurring-transactions`;

  const count = patterns.length;
  const title =
    count === 1
      ? `New recurring pattern: ${patterns[0].merchantName}`
      : `${count} new recurring patterns detected`;

  const lines = patterns.map(
    (p) =>
      `${p.merchantName}: ~$${p.expectedAmount.toFixed(2)} (${p.frequency.replace('_', ' ')})`
  );
  const message =
    count === 1
      ? `We detected a recurring ${patterns[0].frequency.replace('_', ' ')} pattern for ${patterns[0].merchantName} (~$${patterns[0].expectedAmount.toFixed(2)}). Review and confirm it on the recurring transactions page.`
      : `We detected these recurring patterns. Review and confirm them on the recurring transactions page:\n${lines.join('\n')}`;

  const today = new Date().toISOString().split('T')[0];
  const patternKeys = patterns.map((p) => `recurring_new:${p.recurringTransactionId}`);

  return service.createNotification({
    userId,
    budgetAccountId,
    notificationTypeId: 'recurring_transaction_new',
    title,
    message,
    actionUrl,
    actionLabel: 'Review Patterns',
    metadata: {
      recurring_transaction_ids: patterns.map((p) => p.recurringTransactionId),
      patterns: patterns.map((p) => ({
        recurring_transaction_id: p.recurringTransactionId,
        merchant_name: p.merchantName,
        expected_amount: p.expectedAmount,
        frequency: p.frequency,
        confidence_score: p.confidenceScore,
      })),
      dedupe_key: `recurring_new_group:${today}:${patternKeys.join(',')}`,
      pattern_dedupe_keys: patternKeys,
    },
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




