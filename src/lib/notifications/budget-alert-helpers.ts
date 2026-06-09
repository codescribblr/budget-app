import { NotificationService } from './notification-service';

const service = new NotificationService();

export interface CategoryOverBudgetItem {
  categoryId: number;
  categoryName: string;
  spent: number;
  budget: number;
  overBy: number;
}

export interface LowBalanceAccountItem {
  accountId: number;
  accountName: string;
  balance: number;
  threshold: number;
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Send a grouped notification when one or more categories exceed their monthly budget.
 */
export async function createGroupedCategoryOverBudgetNotification(
  userId: string,
  budgetAccountId: number,
  categories: CategoryOverBudgetItem[],
  monthKey: string
): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/dashboard`;

  const count = categories.length;
  const title =
    count === 1
      ? `${categories[0].categoryName} is over budget`
      : `${count} categories are over budget`;

  const lines = categories.map(
    (c) =>
      `${c.categoryName}: ${formatMoney(c.spent)} spent of ${formatMoney(c.budget)} budget (${formatMoney(c.overBy)} over)`
  );
  const message =
    count === 1
      ? `${lines[0]}.`
      : `These categories exceeded their budget this month:\n${lines.join('\n')}`;

  return service.createNotification({
    userId,
    budgetAccountId,
    notificationTypeId: 'budget_category_over_limit',
    title,
    message,
    actionUrl,
    actionLabel: 'View Dashboard',
    metadata: {
      month_key: monthKey,
      category_ids: categories.map((c) => c.categoryId),
      categories: categories.map((c) => ({
        category_id: c.categoryId,
        category_name: c.categoryName,
        spent: c.spent,
        budget: c.budget,
        over_by: c.overBy,
      })),
    },
  });
}

/**
 * Send a grouped notification when one or more accounts fall below the low balance threshold.
 */
export async function createGroupedLowBalanceNotification(
  userId: string,
  budgetAccountId: number,
  accounts: LowBalanceAccountItem[]
): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/accounts`;

  const count = accounts.length;
  const title =
    count === 1
      ? `Low balance: ${accounts[0].accountName}`
      : `${count} accounts have low balances`;

  const lines = accounts.map(
    (a) =>
      `${a.accountName}: ${formatMoney(a.balance)} (threshold: ${formatMoney(a.threshold)})`
  );
  const message =
    count === 1
      ? `${accounts[0].accountName} balance is ${formatMoney(accounts[0].balance)}, below your ${formatMoney(accounts[0].threshold)} alert threshold.`
      : `These accounts are below your alert threshold:\n${lines.join('\n')}`;

  return service.createNotification({
    userId,
    budgetAccountId,
    notificationTypeId: 'budget_low_balance',
    title,
    message,
    actionUrl,
    actionLabel: 'View Accounts',
    metadata: {
      accounts: accounts.map((a) => ({
        account_id: a.accountId,
        account_name: a.accountName,
        balance: a.balance,
        threshold: a.threshold,
      })),
    },
  });
}
