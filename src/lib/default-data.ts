/**
 * Default Data for New Accounts
 *
 * This data can be imported by users to get started with a pre-configured budget.
 * Based on Jonathan's actual budget setup from his Google Sheets.
 */

export const DEFAULT_CATEGORIES = [
  { name: 'Debt Paydown', monthly_amount: 0, sort_order: 1 },
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
  { name: 'security system/cameras', monthly_amount: 0, sort_order: 12 },
  { name: 'utilities', monthly_amount: 250, sort_order: 13 },
  { name: 'gifts', monthly_amount: 50, sort_order: 14 },
  { name: 'home furnishings', monthly_amount: 50, sort_order: 15 },
  { name: 'home repairs', monthly_amount: 100, sort_order: 16 },
  { name: 'gas', monthly_amount: 160, sort_order: 17 },
  { name: 'car payment', monthly_amount: 0, sort_order: 18 },
  { name: 'charity', monthly_amount: 661.29, sort_order: 19 },
  { name: "Heather's allowance", monthly_amount: 30, sort_order: 20 },
  { name: "Jon's allowance", monthly_amount: 30, sort_order: 21 },
  { name: 'kids allowance', monthly_amount: 180, sort_order: 22 },
  { name: 'kids clothing', monthly_amount: 20, sort_order: 23 },
  { name: 'kid activities', monthly_amount: 220.42, sort_order: 24 },
  { name: 'karate', monthly_amount: 258.50, sort_order: 25 },
  { name: 'skating', monthly_amount: 125, sort_order: 26 },
  { name: 'curriculum', monthly_amount: 66.67, sort_order: 27 },
  { name: 'co-op', monthly_amount: 90, sort_order: 28 },
  { name: 'memberships', monthly_amount: 33.33, sort_order: 29 },
  { name: 'fun friday', monthly_amount: 20.83, sort_order: 30 },
  { name: 'school supplies', monthly_amount: 8.33, sort_order: 31 },
  { name: 'projects/extra school books', monthly_amount: 4.17, sort_order: 32 },
  { name: 'association school', monthly_amount: 2.50, sort_order: 33 },
  { name: 'Life/Disability Insurance (1st)', monthly_amount: 45, sort_order: 34 },
  { name: 'Accounting', monthly_amount: 137.50, sort_order: 35 },
  { name: 'His Radio (1st)', monthly_amount: 0, sort_order: 36 },
  { name: 'Compassion Inter. (6th)', monthly_amount: 46.17, sort_order: 37 },
  { name: 'Additional Expenses', monthly_amount: 0, sort_order: 38 },
  { name: 'Auto Deposit Savings', monthly_amount: 0, sort_order: 39 },
  { name: 'Business Expenses', monthly_amount: 97.95, sort_order: 40 },
];

export const DEFAULT_ACCOUNTS = [
  { name: 'Wells Main Checking', balance: 16500.01, account_type: 'checking' as const, include_in_totals: true },
  { name: 'Cash on Hand for Deposit', balance: 0, account_type: 'cash' as const, include_in_totals: false },
  { name: 'Rental Checking', balance: 1318.99, account_type: 'checking' as const, include_in_totals: true },
  { name: 'Rental Savings', balance: 524.83, account_type: 'savings' as const, include_in_totals: true },
];

export const DEFAULT_CREDIT_CARDS = [
  {
    name: "Lowe's",
    credit_limit: 19450,
    available_credit: 19450,
    include_in_totals: true
  },
  {
    name: 'Citi',
    credit_limit: 34000,
    available_credit: 33416.60,
    include_in_totals: true
  },
  {
    name: 'Gold',
    credit_limit: 10000,
    available_credit: 7476.54,
    include_in_totals: true
  },
  {
    name: 'Chase',
    credit_limit: 35000,
    available_credit: 35000,
    include_in_totals: true
  },
  {
    name: 'Chase Freedom',
    credit_limit: 22000,
    available_credit: 21774.53,
    include_in_totals: true
  },
];

export const DEFAULT_SETTINGS = [
  { key: 'annual_salary', value: '163000.00' },
  { key: 'tax_rate', value: '0.2122' },
  { key: 'pre_tax_deductions_monthly', value: '2388.13' },
  // Note: The following are calculated, not stored:
  // - taxes_per_month = ((annual_salary - (pre_tax_deductions_monthly * 12)) * tax_rate) / 12
  // - monthly_gross_income = annual_salary / 12
  // - monthly_net_income = monthly_gross_income - taxes_per_month - pre_tax_deductions_monthly
  // - monthly_budget = sum of all category monthly_amounts
];

