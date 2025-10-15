import db from '../src/lib/db';

// Clear existing data
function clearData() {
  db.exec('DELETE FROM transaction_splits');
  db.exec('DELETE FROM transactions');
  db.exec('DELETE FROM pending_checks');
  db.exec('DELETE FROM categories');
  db.exec('DELETE FROM accounts');
  db.exec('DELETE FROM credit_cards');
  db.exec('DELETE FROM settings');
}

// Seed categories with monthly amounts and current balances
function seedCategories() {
  const categories = [
    { name: 'Debt Paydown', monthly_amount: 0.00, current_balance: 0.00, sort_order: 1 },
    { name: 'food', monthly_amount: 1400.00, current_balance: 420.08, sort_order: 2 },
    { name: 'shopping', monthly_amount: 80.00, current_balance: 178.48, sort_order: 3 },
    { name: 'medical (1st)', monthly_amount: 100.00, current_balance: 909.80, sort_order: 4 },
    { name: 'mortgage & insurance', monthly_amount: 2981.00, current_balance: 0.00, sort_order: 5 },
    { name: 'car insurance', monthly_amount: 207.34, current_balance: 1263.49, sort_order: 6 },
    { name: 'car repairs', monthly_amount: 342.92, current_balance: 815.52, sort_order: 7 },
    { name: 'car taxes', monthly_amount: 100.17, current_balance: 126.89, sort_order: 8 },
    { name: 'garbage pickup', monthly_amount: 25.00, current_balance: 50.00, sort_order: 9 },
    { name: 'cell phone', monthly_amount: 115.00, current_balance: 774.22, sort_order: 10 },
    { name: 'internet', monthly_amount: 75.00, current_balance: 98.50, sort_order: 11 },
    { name: 'security system/cameras', monthly_amount: 0.00, current_balance: 0.00, sort_order: 12 },
    { name: 'utilities', monthly_amount: 250.00, current_balance: 481.97, sort_order: 13 },
    { name: 'gifts', monthly_amount: 50.00, current_balance: 126.12, sort_order: 14 },
    { name: 'home furnishings', monthly_amount: 50.00, current_balance: 328.56, sort_order: 15 },
    { name: 'home repairs', monthly_amount: 100.00, current_balance: 1.86, sort_order: 16 },
    { name: 'gas', monthly_amount: 160.00, current_balance: 225.94, sort_order: 17 },
    { name: 'car payment', monthly_amount: 0.00, current_balance: 0.00, sort_order: 18 },
    { name: 'charity', monthly_amount: 661.29, current_balance: 811.29, sort_order: 19 },
    { name: "Heather's allowance", monthly_amount: 30.00, current_balance: 302.89, sort_order: 20 },
    { name: "Jon's allowance", monthly_amount: 30.00, current_balance: 205.02, sort_order: 21 },
    { name: 'kids allowance', monthly_amount: 180.00, current_balance: 340.00, sort_order: 22 },
    { name: 'kids clothing', monthly_amount: 20.00, current_balance: 147.91, sort_order: 23 },
    { name: 'kids activities', monthly_amount: 220.42, current_balance: 1285.43, sort_order: 24 },
    { name: 'karate', monthly_amount: 258.50, current_balance: 601.87, sort_order: 25 },
    { name: 'skating', monthly_amount: 125.00, current_balance: 402.60, sort_order: 26 },
    { name: 'curriculum', monthly_amount: 66.67, current_balance: 104.25, sort_order: 27 },
    { name: 'co-op', monthly_amount: 90.00, current_balance: 153.62, sort_order: 28 },
    { name: 'memberships', monthly_amount: 33.33, current_balance: 311.07, sort_order: 29 },
    { name: 'fun friday', monthly_amount: 20.83, current_balance: 73.53, sort_order: 30 },
    { name: 'school supplies', monthly_amount: 8.33, current_balance: 51.63, sort_order: 31 },
    { name: 'projects/extra school books', monthly_amount: 4.17, current_balance: 45.06, sort_order: 32 },
    { name: 'association school', monthly_amount: 2.50, current_balance: 17.50, sort_order: 33 },
    { name: 'Life/Disability Insurance (1st)', monthly_amount: 45.00, current_balance: 84.96, sort_order: 34 },
    { name: 'Accounting', monthly_amount: 137.50, current_balance: 325.00, sort_order: 35 },
    { name: 'His Radio (1st)', monthly_amount: 0.00, current_balance: 0.00, sort_order: 36 },
    { name: 'Compassion Inter. (6th)', monthly_amount: 46.17, current_balance: 47.06, sort_order: 37 },
    { name: 'Additional Expenses', monthly_amount: 0.00, current_balance: 0.00, sort_order: 38 },
    { name: 'Auto Deposit Savings', monthly_amount: 0.00, current_balance: 0.00, sort_order: 39 },
    { name: 'Business Expenses', monthly_amount: 97.95, current_balance: 97.95, sort_order: 40 },
  ];

  const stmt = db.prepare(`
    INSERT INTO categories (name, monthly_amount, current_balance, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  for (const category of categories) {
    stmt.run(category.name, category.monthly_amount, category.current_balance, category.sort_order);
  }
}

// Seed accounts
function seedAccounts() {
  const accounts = [
    { name: 'Wells Main Checking', balance: 16500.01, account_type: 'checking', sort_order: 1 },
    { name: 'Rental Checking', balance: 1318.99, account_type: 'checking', sort_order: 2 },
    { name: 'Rental Savings', balance: 524.83, account_type: 'savings', sort_order: 3 },
  ];

  const stmt = db.prepare(`
    INSERT INTO accounts (name, balance, account_type, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  for (const account of accounts) {
    stmt.run(account.name, account.balance, account.account_type, account.sort_order);
  }
}

// Seed credit cards
function seedCreditCards() {
  const creditCards = [
    { name: "Lowe's", available_credit: 19450.00, current_balance: 0.00, sort_order: 1 },
    { name: 'Citi', available_credit: 33416.60, current_balance: 583.40, sort_order: 2 },
    { name: 'Gold', available_credit: 7476.54, current_balance: 2523.46, sort_order: 3 },
    { name: 'Chase', available_credit: 35000.00, current_balance: 0.00, sort_order: 4 },
    { name: 'Chase Freedom', available_credit: 21774.53, current_balance: 225.47, sort_order: 5 },
  ];

  const stmt = db.prepare(`
    INSERT INTO credit_cards (name, available_credit, current_balance, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  for (const card of creditCards) {
    stmt.run(card.name, card.available_credit, card.current_balance, card.sort_order);
  }
}

// Seed settings
function seedSettings() {
  const settings = [
    { key: 'salary', value: '163000.00' },
    { key: 'tax_rate', value: '0.2122' },
    { key: 'pre_tax_deductions', value: '2388.13' },
    { key: 'taxes_per_month', value: '2154.31' },
    { key: 'monthly_net_income', value: '7996.02' },
    { key: 'monthly_budget', value: '8114.08' },
  ];

  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
  `);

  for (const setting of settings) {
    stmt.run(setting.key, setting.value);
  }
}

// Main seed function
function seed() {
  console.log('Clearing existing data...');
  clearData();

  console.log('Seeding categories...');
  seedCategories();

  console.log('Seeding accounts...');
  seedAccounts();

  console.log('Seeding credit cards...');
  seedCreditCards();

  console.log('Seeding settings...');
  seedSettings();

  console.log('Seed completed successfully!');
}

// Run seed
seed();

