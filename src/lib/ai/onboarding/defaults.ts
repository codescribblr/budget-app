/** Shared starter categories for wizard + AI onboarding. */

export const DEFAULT_ONBOARDING_CATEGORIES = [
  'Rent/Mortgage',
  'Utilities',
  'Groceries',
  'Transportation',
  'Insurance',
  'Dining Out',
  'Entertainment',
  'Personal Care',
  'Savings',
  'Phone/Internet',
  'Clothing',
  'Emergency Fund',
  'Subscriptions',
  'Healthcare/Medical',
  'Gas/Fuel',
  'Home Maintenance',
  'Pet Care',
  'Education',
  'Gifts/Donations',
  'Travel',
  'Debt Payment',
  'Miscellaneous',
] as const;

export const DEFAULT_SELECTED_CATEGORIES = [
  'Rent/Mortgage',
  'Utilities',
  'Groceries',
  'Transportation',
  'Insurance',
  'Dining Out',
  'Entertainment',
  'Personal Care',
  'Savings',
  'Phone/Internet',
] as const;

/** Rough starter monthly targets as share of monthly income (beginner guidance). */
export const CATEGORY_INCOME_SHARES: Record<string, number> = {
  'Rent/Mortgage': 0.3,
  Utilities: 0.05,
  Groceries: 0.1,
  Transportation: 0.05,
  Insurance: 0.05,
  'Dining Out': 0.04,
  Entertainment: 0.03,
  'Personal Care': 0.02,
  Savings: 0.1,
  'Phone/Internet': 0.03,
  Clothing: 0.02,
  'Emergency Fund': 0.05,
  Subscriptions: 0.02,
  'Healthcare/Medical': 0.03,
  'Gas/Fuel': 0.04,
  'Home Maintenance': 0.02,
  'Pet Care': 0.02,
  Education: 0.02,
  'Gifts/Donations': 0.02,
  Travel: 0.02,
  'Debt Payment': 0.1,
  Miscellaneous: 0.03,
};

export function suggestMonthlyAmount(
  categoryName: string,
  monthlyIncome: number
): number {
  if (!monthlyIncome || monthlyIncome <= 0) return 0;
  const share = CATEGORY_INCOME_SHARES[categoryName] ?? 0.03;
  return Math.round(monthlyIncome * share);
}
