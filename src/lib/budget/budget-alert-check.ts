import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/notifications/notification-service';
import {
  createGroupedCategoryOverBudgetNotification,
  createGroupedLowBalanceNotification,
  type CategoryOverBudgetItem,
  type LowBalanceAccountItem,
} from '@/lib/notifications/budget-alert-helpers';
import {
  computeMonthlySpendingByCategory,
  getCurrentMonthKey,
} from './monthly-spending';
import {
  accountEntityKey,
  categoryEntityKey,
  clearBudgetAlertEpisode,
  getEpisodeFromSettings,
  recordBudgetAlertSent,
  shouldSendBudgetAlert,
} from './budget-alert-episode';

const notificationService = new NotificationService();

const BUDGET_CATEGORY_OVER_LIMIT = 'budget_category_over_limit';
const BUDGET_LOW_BALANCE = 'budget_low_balance';

const DEFAULT_LOW_BALANCE_THRESHOLD = 100;

async function getBudgetAccountMemberUserIds(
  supabase: SupabaseClient,
  budgetAccountId: number
): Promise<string[]> {
  const { data: account } = await supabase
    .from('budget_accounts')
    .select('owner_id')
    .eq('id', budgetAccountId)
    .is('deleted_at', null)
    .maybeSingle();

  const { data: members } = await supabase
    .from('account_users')
    .select('user_id')
    .eq('account_id', budgetAccountId)
    .eq('status', 'active');

  const ids = new Set<string>();
  if (account?.owner_id) ids.add(account.owner_id);
  members?.forEach((m) => ids.add(m.user_id));
  return Array.from(ids);
}

async function getLowBalanceThreshold(userId: string): Promise<number> {
  const preferences = await notificationService.getUserPreferences(userId, BUDGET_LOW_BALANCE);
  const threshold = preferences.settings?.low_balance_threshold;
  if (typeof threshold === 'number' && threshold > 0) {
    return threshold;
  }
  return DEFAULT_LOW_BALANCE_THRESHOLD;
}

/**
 * Check categories that exceeded monthly budget and send grouped notifications per user.
 * One notification per category per month while over budget; clears when spending returns under budget.
 */
export async function checkCategoryOverBudgetAlerts(
  budgetAccountId: number,
  options?: { categoryIds?: number[] }
): Promise<{ notificationsSent: number }> {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();
  const monthKey = getCurrentMonthKey();

  const spendingByCategory = await computeMonthlySpendingByCategory(
    supabase,
    budgetAccountId,
    year,
    monthIndex0
  );

  let categoryQuery = supabase
    .from('categories')
    .select('id, name, monthly_amount, category_type, is_system, is_archived')
    .eq('account_id', budgetAccountId)
    .eq('category_type', 'monthly_expense')
    .eq('is_archived', false)
    .eq('is_system', false)
    .gt('monthly_amount', 0);

  if (options?.categoryIds?.length) {
    categoryQuery = categoryQuery.in('id', options.categoryIds);
  }

  const { data: categories, error } = await categoryQuery;
  if (error) {
    console.error('Error fetching categories for budget alerts:', error);
    return { notificationsSent: 0 };
  }

  const userIds = await getBudgetAccountMemberUserIds(supabase, budgetAccountId);
  const overBudget: CategoryOverBudgetItem[] = [];
  const underBudgetCategoryIds: number[] = [];

  for (const category of categories || []) {
    const budget = Number(category.monthly_amount);
    const spent = spendingByCategory[category.id] || 0;
    if (spent > budget) {
      overBudget.push({
        categoryId: category.id,
        categoryName: category.name,
        spent,
        budget,
        overBy: spent - budget,
      });
    } else {
      underBudgetCategoryIds.push(category.id);
    }
  }

  // Clear episodes for categories back under budget (all members)
  for (const userId of userIds) {
    for (const categoryId of underBudgetCategoryIds) {
      await clearBudgetAlertEpisode(
        userId,
        BUDGET_CATEGORY_OVER_LIMIT,
        budgetAccountId,
        categoryEntityKey(categoryId)
      );
    }
  }

  if (overBudget.length === 0) {
    return { notificationsSent: 0 };
  }

  let notificationsSent = 0;

  for (const userId of userIds) {
    const preferences = await notificationService.getUserPreferences(
      userId,
      BUDGET_CATEGORY_OVER_LIMIT
    );
    if (!preferences.inAppEnabled && !preferences.emailEnabled) {
      continue;
    }

    const toNotify: CategoryOverBudgetItem[] = [];
    for (const item of overBudget) {
      const entityKey = categoryEntityKey(item.categoryId);
      const episode = getEpisodeFromSettings(
        preferences.settings,
        budgetAccountId,
        entityKey
      );
      if (shouldSendBudgetAlert(episode, now)) {
        toNotify.push(item);
      }
    }

    if (toNotify.length === 0) continue;

    try {
      await createGroupedCategoryOverBudgetNotification(
        userId,
        budgetAccountId,
        toNotify,
        monthKey
      );

      for (const item of toNotify) {
        await recordBudgetAlertSent(
          userId,
          BUDGET_CATEGORY_OVER_LIMIT,
          budgetAccountId,
          categoryEntityKey(item.categoryId),
          now
        );
      }

      notificationsSent++;
    } catch (err) {
      console.error(`Failed to send category over budget alert for user ${userId}:`, err);
    }
  }

  return { notificationsSent };
}

/**
 * Check account balances against low balance threshold.
 * One notification per account per month while below threshold; clears when balance recovers.
 */
export async function checkLowBalanceAlerts(
  budgetAccountId: number,
  options?: {
    accountId?: number;
    previousBalance?: number;
    newBalance?: number;
  }
): Promise<{ notificationsSent: number }> {
  const supabase = createServiceRoleClient();
  const now = new Date();

  let accountsQuery = supabase
    .from('accounts')
    .select('id, name, balance')
    .eq('account_id', budgetAccountId);

  if (options?.accountId) {
    accountsQuery = accountsQuery.eq('id', options.accountId);
  }

  const { data: accounts, error } = await accountsQuery;
  if (error) {
    console.error('Error fetching accounts for low balance alerts:', error);
    return { notificationsSent: 0 };
  }

  const userIds = await getBudgetAccountMemberUserIds(supabase, budgetAccountId);
  let notificationsSent = 0;

  for (const userId of userIds) {
    const preferences = await notificationService.getUserPreferences(userId, BUDGET_LOW_BALANCE);
    const threshold = await getLowBalanceThreshold(userId);
    const notificationsEnabled = preferences.inAppEnabled || preferences.emailEnabled;

    const lowAccounts: LowBalanceAccountItem[] = [];

    for (const account of accounts || []) {
      const isTargetAccount = options?.accountId === account.id;
      const balance =
        isTargetAccount && options?.newBalance !== undefined
          ? options.newBalance
          : Number(account.balance);

      const entityKey = accountEntityKey(account.id);

      if (balance >= threshold) {
        await clearBudgetAlertEpisode(
          userId,
          BUDGET_LOW_BALANCE,
          budgetAccountId,
          entityKey
        );
        continue;
      }

      if (!notificationsEnabled) {
        continue;
      }

      const episode = getEpisodeFromSettings(
        preferences.settings,
        budgetAccountId,
        entityKey
      );
      if (!shouldSendBudgetAlert(episode, now)) {
        continue;
      }

      lowAccounts.push({
        accountId: account.id,
        accountName: account.name,
        balance,
        threshold,
      });
    }

    if (lowAccounts.length === 0) continue;

    try {
      await createGroupedLowBalanceNotification(userId, budgetAccountId, lowAccounts);

      for (const item of lowAccounts) {
        await recordBudgetAlertSent(
          userId,
          BUDGET_LOW_BALANCE,
          budgetAccountId,
          accountEntityKey(item.accountId),
          now
        );
      }

      notificationsSent++;
    } catch (err) {
      console.error(`Failed to send low balance alert for user ${userId}:`, err);
    }
  }

  return { notificationsSent };
}

/**
 * Run all budget alert checks for a budget account (scheduled job).
 */
export async function processBudgetAlerts(): Promise<{
  categoryAlertsSent: number;
  lowBalanceAlertsSent: number;
}> {
  const supabase = createServiceRoleClient();

  const { data: budgetAccounts, error } = await supabase
    .from('budget_accounts')
    .select('id')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching budget accounts for alerts:', error);
    return { categoryAlertsSent: 0, lowBalanceAlertsSent: 0 };
  }

  let categoryAlertsSent = 0;
  let lowBalanceAlertsSent = 0;

  for (const account of budgetAccounts || []) {
    const categoryResult = await checkCategoryOverBudgetAlerts(account.id);
    categoryAlertsSent += categoryResult.notificationsSent;

    const lowBalanceResult = await checkLowBalanceAlerts(account.id);
    lowBalanceAlertsSent += lowBalanceResult.notificationsSent;
  }

  return { categoryAlertsSent, lowBalanceAlertsSent };
}

/**
 * Fire-and-forget budget alert check after transaction changes.
 */
export function scheduleCategoryOverBudgetCheck(
  budgetAccountId: number,
  categoryIds?: number[]
): void {
  void checkCategoryOverBudgetAlerts(budgetAccountId, { categoryIds }).catch((err) => {
    console.error('Category over budget check failed:', err);
  });
}

export function scheduleLowBalanceCheck(
  budgetAccountId: number,
  accountId: number,
  previousBalance: number,
  newBalance: number
): void {
  void checkLowBalanceAlerts(budgetAccountId, {
    accountId,
    previousBalance,
    newBalance,
  }).catch((err) => {
    console.error('Low balance check failed:', err);
  });
}
