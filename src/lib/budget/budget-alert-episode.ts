import { createServiceRoleClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/notifications/notification-service';
import { getCurrentMonthKey } from './monthly-spending';

function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Minimum days between alerts when an issue persists across calendar months. */
export const MIN_DAYS_BETWEEN_PERSISTENT_ALERTS = 5;

export interface BudgetAlertEpisode {
  active: boolean;
  lastNotifiedAt?: string;
  lastNotifiedMonth?: string;
}

type EpisodeMap = Record<string, BudgetAlertEpisode>;

function scopedEpisodeKey(budgetAccountId: number, entityKey: string): string {
  return `${budgetAccountId}:${entityKey}`;
}

function daysBetweenDates(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Whether we should send an alert for an entity that is currently in the "bad" state.
 * - New episode or cleared episode → send
 * - Active episode, same calendar month → do not send
 * - Active episode, new month → send only if at least MIN_DAYS since last alert
 */
export function shouldSendBudgetAlert(
  episode: BudgetAlertEpisode | undefined,
  now: Date = new Date()
): boolean {
  if (!episode?.active) {
    return true;
  }

  const currentMonth = monthKeyFromDate(now);
  if (episode.lastNotifiedMonth === currentMonth) {
    return false;
  }

  if (!episode.lastNotifiedAt) {
    return true;
  }

  const daysSince = daysBetweenDates(new Date(episode.lastNotifiedAt), now);
  return daysSince >= MIN_DAYS_BETWEEN_PERSISTENT_ALERTS;
}

export function getEpisodeFromSettings(
  settings: Record<string, unknown> | undefined,
  budgetAccountId: number,
  entityKey: string
): BudgetAlertEpisode | undefined {
  const episodes = settings?.episodes as EpisodeMap | undefined;
  if (!episodes) return undefined;
  return episodes[scopedEpisodeKey(budgetAccountId, entityKey)];
}

const notificationService = new NotificationService();

async function persistEpisodeSettings(
  userId: string,
  notificationTypeId: string,
  settings: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from('user_notification_preferences')
    .select('id, email_enabled, in_app_enabled, push_enabled')
    .eq('user_id', userId)
    .eq('notification_type_id', notificationTypeId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_notification_preferences')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return;
  }

  const defaults = await notificationService.getUserPreferences(userId, notificationTypeId);
  await supabase.from('user_notification_preferences').insert({
    user_id: userId,
    notification_type_id: notificationTypeId,
    email_enabled: defaults.emailEnabled,
    in_app_enabled: defaults.inAppEnabled,
    push_enabled: defaults.pushEnabled,
    settings,
  });
}

/**
 * Mark an alert episode as cleared (e.g. balance recovered or spending back under budget).
 */
export async function clearBudgetAlertEpisode(
  userId: string,
  notificationTypeId: string,
  budgetAccountId: number,
  entityKey: string
): Promise<void> {
  const preferences = await notificationService.getUserPreferences(userId, notificationTypeId);
  const episodes = { ...(preferences.settings?.episodes as EpisodeMap | undefined) };
  const key = scopedEpisodeKey(budgetAccountId, entityKey);
  const existing = episodes[key];

  if (!existing?.active) {
    return;
  }

  episodes[key] = {
    ...existing,
    active: false,
  };

  await persistEpisodeSettings(userId, notificationTypeId, {
    ...preferences.settings,
    episodes,
  });
}

/**
 * Record that we sent an alert for this entity (starts or continues an active episode).
 */
export async function recordBudgetAlertSent(
  userId: string,
  notificationTypeId: string,
  budgetAccountId: number,
  entityKey: string,
  now: Date = new Date()
): Promise<void> {
  const preferences = await notificationService.getUserPreferences(userId, notificationTypeId);
  const episodes = { ...(preferences.settings?.episodes as EpisodeMap | undefined) };
  const key = scopedEpisodeKey(budgetAccountId, entityKey);

  episodes[key] = {
    active: true,
    lastNotifiedAt: now.toISOString(),
    lastNotifiedMonth: getCurrentMonthKey(),
  };

  await persistEpisodeSettings(userId, notificationTypeId, {
    ...preferences.settings,
    episodes,
  });
}

export function accountEntityKey(accountId: number): string {
  return `account:${accountId}`;
}

export function categoryEntityKey(categoryId: number): string {
  return `category:${categoryId}`;
}
