import db from './db';
import type {
  Category,
  Account,
  CreditCard,
  Transaction,
  TransactionSplit,
  PendingCheck,
  Setting,
  TransactionWithSplits,
  DashboardSummary,
} from './types';

// Categories
export function getAllCategories(): Category[] {
  return db.prepare('SELECT * FROM categories WHERE is_archived = 0 ORDER BY sort_order').all() as Category[];
}

export function getCategoryById(id: number): Category | undefined {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
}

export function createCategory(data: {
  name: string;
  monthly_amount: number;
  current_balance?: number;
  sort_order?: number;
}): Category {
  const stmt = db.prepare(`
    INSERT INTO categories (name, monthly_amount, current_balance, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.monthly_amount,
    data.current_balance ?? 0,
    data.sort_order ?? 0
  );

  return getCategoryById(result.lastInsertRowid as number)!;
}

export function updateCategory(
  id: number,
  data: Partial<{
    name: string;
    monthly_amount: number;
    current_balance: number;
    sort_order: number;
  }>
): Category | undefined {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.monthly_amount !== undefined) {
    updates.push('monthly_amount = ?');
    values.push(data.monthly_amount);
  }
  if (data.current_balance !== undefined) {
    updates.push('current_balance = ?');
    values.push(data.current_balance);
  }
  if (data.sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(data.sort_order);
  }

  if (updates.length === 0) return getCategoryById(id);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`
    UPDATE categories
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
  return getCategoryById(id);
}

export function deleteCategory(id: number): void {
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

// Accounts
export function getAllAccounts(): Account[] {
  return db.prepare('SELECT * FROM accounts ORDER BY sort_order').all() as Account[];
}

export function getAccountById(id: number): Account | undefined {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
}

export function createAccount(data: {
  name: string;
  balance: number;
  account_type: 'checking' | 'savings' | 'cash';
  include_in_totals?: number;
  sort_order?: number;
}): Account {
  const stmt = db.prepare(`
    INSERT INTO accounts (name, balance, account_type, include_in_totals, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.balance,
    data.account_type,
    data.include_in_totals ?? 1,
    data.sort_order ?? 0
  );

  return getAccountById(result.lastInsertRowid as number)!;
}

export function updateAccount(
  id: number,
  data: Partial<{
    name: string;
    balance: number;
    account_type: 'checking' | 'savings' | 'cash';
    include_in_totals: number;
    sort_order: number;
  }>
): Account | undefined {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.balance !== undefined) {
    updates.push('balance = ?');
    values.push(data.balance);
  }
  if (data.account_type !== undefined) {
    updates.push('account_type = ?');
    values.push(data.account_type);
  }
  if (data.include_in_totals !== undefined) {
    updates.push('include_in_totals = ?');
    values.push(data.include_in_totals);
  }
  if (data.sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(data.sort_order);
  }

  if (updates.length === 0) return getAccountById(id);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`
    UPDATE accounts
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
  return getAccountById(id);
}

export function deleteAccount(id: number): void {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

// Credit Cards
function calculateCreditCardBalance(card: any): CreditCard {
  return {
    ...card,
    current_balance: card.credit_limit - card.available_credit,
  };
}

export function getAllCreditCards(): CreditCard[] {
  const cards = db.prepare('SELECT * FROM credit_cards ORDER BY sort_order').all() as any[];
  return cards.map(calculateCreditCardBalance);
}

export function getCreditCardById(id: number): CreditCard | undefined {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(id) as any;
  return card ? calculateCreditCardBalance(card) : undefined;
}

export function createCreditCard(data: {
  name: string;
  credit_limit: number;
  available_credit: number;
  include_in_totals?: number;
  sort_order?: number;
}): CreditCard {
  const stmt = db.prepare(`
    INSERT INTO credit_cards (name, credit_limit, available_credit, include_in_totals, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.credit_limit,
    data.available_credit,
    data.include_in_totals ?? 1,
    data.sort_order ?? 0
  );

  return getCreditCardById(result.lastInsertRowid as number)!;
}

export function updateCreditCard(
  id: number,
  data: Partial<{
    name: string;
    credit_limit: number;
    available_credit: number;
    include_in_totals: number;
    sort_order: number;
  }>
): CreditCard | undefined {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.credit_limit !== undefined) {
    updates.push('credit_limit = ?');
    values.push(data.credit_limit);
  }
  if (data.available_credit !== undefined) {
    updates.push('available_credit = ?');
    values.push(data.available_credit);
  }
  if (data.include_in_totals !== undefined) {
    updates.push('include_in_totals = ?');
    values.push(data.include_in_totals);
  }
  if (data.sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(data.sort_order);
  }

  if (updates.length === 0) return getCreditCardById(id);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`
    UPDATE credit_cards
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
  return getCreditCardById(id);
}

export function deleteCreditCard(id: number): void {
  db.prepare('DELETE FROM credit_cards WHERE id = ?').run(id);
}

// Pending Checks
export function getAllPendingChecks(): PendingCheck[] {
  return db.prepare('SELECT * FROM pending_checks ORDER BY created_at DESC').all() as PendingCheck[];
}

export function getPendingCheckById(id: number): PendingCheck | undefined {
  return db.prepare('SELECT * FROM pending_checks WHERE id = ?').get(id) as PendingCheck | undefined;
}

export function createPendingCheck(data: { description: string; amount: number; type?: 'expense' | 'income' }): PendingCheck {
  const stmt = db.prepare(`
    INSERT INTO pending_checks (description, amount, type)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(data.description, data.amount, data.type || 'expense');
  return getPendingCheckById(result.lastInsertRowid as number)!;
}

export function updatePendingCheck(
  id: number,
  data: Partial<{ description: string; amount: number; type: 'expense' | 'income' }>
): PendingCheck | undefined {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.amount !== undefined) {
    updates.push('amount = ?');
    values.push(data.amount);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }

  if (updates.length === 0) return getPendingCheckById(id);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`
    UPDATE pending_checks
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
  return getPendingCheckById(id);
}

export function deletePendingCheck(id: number): void {
  db.prepare('DELETE FROM pending_checks WHERE id = ?').run(id);
}

// Transactions
export function getAllTransactions(): TransactionWithSplits[] {
  const transactions = db
    .prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC')
    .all() as Transaction[];

  return transactions.map((transaction) => {
    const splits = db
      .prepare(
        `
      SELECT ts.*, c.name as category_name
      FROM transaction_splits ts
      JOIN categories c ON ts.category_id = c.id
      WHERE ts.transaction_id = ?
    `
      )
      .all(transaction.id) as (TransactionSplit & { category_name: string })[];

    return {
      ...transaction,
      splits,
    };
  });
}

export function getTransactionById(id: number): TransactionWithSplits | undefined {
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as
    | Transaction
    | undefined;

  if (!transaction) return undefined;

  const splits = db
    .prepare(
      `
    SELECT ts.*, c.name as category_name
    FROM transaction_splits ts
    JOIN categories c ON ts.category_id = c.id
    WHERE ts.transaction_id = ?
  `
    )
    .all(transaction.id) as (TransactionSplit & { category_name: string })[];

  return {
    ...transaction,
    splits,
  };
}

export function createTransaction(data: {
  date: string;
  description: string;
  splits: { category_id: number; amount: number }[];
}): TransactionWithSplits {
  const totalAmount = data.splits.reduce((sum, split) => sum + split.amount, 0);

  // Start transaction
  const insertTransaction = db.prepare(`
    INSERT INTO transactions (date, description, total_amount)
    VALUES (?, ?, ?)
  `);

  const insertSplit = db.prepare(`
    INSERT INTO transaction_splits (transaction_id, category_id, amount)
    VALUES (?, ?, ?)
  `);

  const updateCategoryBalance = db.prepare(`
    UPDATE categories
    SET current_balance = current_balance - ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_system = 0
  `);

  const transaction = db.transaction(() => {
    const result = insertTransaction.run(data.date, data.description, totalAmount);
    const transactionId = result.lastInsertRowid as number;

    for (const split of data.splits) {
      insertSplit.run(transactionId, split.category_id, split.amount);
      updateCategoryBalance.run(split.amount, split.category_id);
    }

    return transactionId;
  });

  const transactionId = transaction();
  return getTransactionById(transactionId)!;
}

export function updateTransaction(
  id: number,
  data: {
    date?: string;
    description?: string;
    splits?: { category_id: number; amount: number }[];
  }
): TransactionWithSplits | undefined {
  const existingTransaction = getTransactionById(id);
  if (!existingTransaction) return undefined;

  const updateTransactionStmt = db.prepare(`
    UPDATE transactions
    SET date = ?, description = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const deleteSplitsStmt = db.prepare('DELETE FROM transaction_splits WHERE transaction_id = ?');

  const insertSplitStmt = db.prepare(`
    INSERT INTO transaction_splits (transaction_id, category_id, amount)
    VALUES (?, ?, ?)
  `);

  const updateCategoryBalanceStmt = db.prepare(`
    UPDATE categories
    SET current_balance = current_balance + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_system = 0
  `);

  const transaction = db.transaction(() => {
    // Reverse old splits
    for (const split of existingTransaction.splits) {
      updateCategoryBalanceStmt.run(split.amount, split.category_id);
    }

    // Update transaction
    const newDate = data.date ?? existingTransaction.date;
    const newDescription = data.description ?? existingTransaction.description;
    const newSplits = data.splits ?? existingTransaction.splits;
    const newTotalAmount = newSplits.reduce((sum, split) => sum + split.amount, 0);

    updateTransactionStmt.run(newDate, newDescription, newTotalAmount, id);

    // Delete old splits
    deleteSplitsStmt.run(id);

    // Insert new splits and update balances
    for (const split of newSplits) {
      insertSplitStmt.run(id, split.category_id, split.amount);
      updateCategoryBalanceStmt.run(-split.amount, split.category_id);
    }
  });

  transaction();
  return getTransactionById(id);
}

export function deleteTransaction(id: number): void {
  const transaction = getTransactionById(id);
  if (!transaction) return;

  const deleteSplitsStmt = db.prepare('DELETE FROM transaction_splits WHERE transaction_id = ?');
  const deleteTransactionStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
  const updateCategoryBalanceStmt = db.prepare(`
    UPDATE categories
    SET current_balance = current_balance + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_system = 0
  `);

  const deleteTransactionTx = db.transaction(() => {
    // Reverse splits
    for (const split of transaction.splits) {
      updateCategoryBalanceStmt.run(split.amount, split.category_id);
    }

    deleteSplitsStmt.run(id);
    deleteTransactionStmt.run(id);
  });

  deleteTransactionTx();
}

// Dashboard Summary
export function getDashboardSummary(): DashboardSummary {
  const totalMonies = db
    .prepare('SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE include_in_totals = 1')
    .get() as { total: number };

  const totalEnvelopes = db
    .prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM categories WHERE is_system = 0')
    .get() as { total: number };

  const hasNegativeEnvelopes = db
    .prepare('SELECT COUNT(*) as count FROM categories WHERE is_system = 0 AND current_balance < 0')
    .get() as { count: number };

  const totalCreditCardBalances = db
    .prepare('SELECT COALESCE(SUM(credit_limit - available_credit), 0) as total FROM credit_cards WHERE include_in_totals = 1')
    .get() as { total: number };

  // Calculate pending checks total: expenses subtract, income adds
  // Income is positive (adds to available funds), expense is negative (subtracts from available funds)
  const pendingChecks = db.prepare('SELECT amount, type FROM pending_checks').all() as Array<{ amount: number; type: 'expense' | 'income' }>;
  const totalPendingChecks = {
    total: pendingChecks.reduce((sum, pc) => {
      return sum + (pc.type === 'income' ? pc.amount : -pc.amount);
    }, 0)
  };

  // Add totalPendingChecks (income increases savings, expenses decrease savings)
  const currentSavings =
    totalMonies.total -
    totalEnvelopes.total -
    totalCreditCardBalances.total +
    totalPendingChecks.total;

  return {
    total_monies: totalMonies.total,
    total_envelopes: totalEnvelopes.total,
    total_credit_card_balances: totalCreditCardBalances.total,
    total_pending_checks: totalPendingChecks.total,
    current_savings: currentSavings,
    has_negative_envelopes: hasNegativeEnvelopes.count > 0,
    monthly_net_income: 0, // Not used in SQLite version
    total_monthly_budget: 0, // Not used in SQLite version
  };
}

