/**
 * Default Data for New Accounts
 * 
 * This data can be imported by users to get started with a pre-configured budget.
 * Based on Jonathan's actual budget setup.
 */

export const DEFAULT_CATEGORIES = [
  { name: 'food', monthly_amount: 1400, sort_order: 2 },
  { name: 'shopping', monthly_amount: 80, sort_order: 3 },
  { name: 'medical (1st)', monthly_amount: 100, sort_order: 4 },
  { name: 'mortgage & insurance', monthly_amount: 2981, sort_order: 5 },
  { name: 'car insurance', monthly_amount: 207.34, sort_order: 6 },
  { name: 'car repairs', monthly_amount: 342.92, sort_order: 7 },
  { name: 'car taxes', monthly_amount: 100.17, sort_order: 8 },
  { name: 'garbage pickup', monthly_amount: 25, sort_order: 9 },
  { name: 'cell phone', monthly_amount: 115, sort_order: 10 },
  { name: 'internet', monthly_amount: 75, sort_order: 11 },
  { name: 'electricity', monthly_amount: 150, sort_order: 12 },
  { name: 'water', monthly_amount: 50, sort_order: 13 },
  { name: 'gas', monthly_amount: 200, sort_order: 14 },
  { name: 'entertainment', monthly_amount: 100, sort_order: 15 },
  { name: 'clothing', monthly_amount: 100, sort_order: 16 },
  { name: 'gifts', monthly_amount: 100, sort_order: 17 },
  { name: 'personal care', monthly_amount: 50, sort_order: 18 },
  { name: 'home maintenance', monthly_amount: 200, sort_order: 19 },
  { name: 'subscriptions', monthly_amount: 50, sort_order: 20 },
  { name: 'savings', monthly_amount: 500, sort_order: 21 },
  { name: 'emergency fund', monthly_amount: 200, sort_order: 22 },
  { name: 'vacation', monthly_amount: 200, sort_order: 23 },
  { name: 'education', monthly_amount: 100, sort_order: 24 },
  { name: 'charity', monthly_amount: 100, sort_order: 25 },
  { name: 'miscellaneous', monthly_amount: 100, sort_order: 26 },
];

export const DEFAULT_ACCOUNTS = [
  { name: 'Checking', balance: 5000, include_in_totals: 1 },
  { name: 'Savings', balance: 10000, include_in_totals: 1 },
];

export const DEFAULT_CREDIT_CARDS = [
  { 
    name: 'Visa', 
    credit_limit: 10000, 
    available_credit: 8000,
    include_in_totals: 1 
  },
  { 
    name: 'Mastercard', 
    credit_limit: 5000, 
    available_credit: 5000,
    include_in_totals: 1 
  },
];

export const DEFAULT_SETTINGS = [
  { key: 'default_account_id', value: '1' },
  { key: 'auto_categorize', value: 'true' },
  { key: 'theme', value: 'light' },
];

