import type { SupabaseClient } from '@supabase/supabase-js';
import type { BalanceChangeType } from './category-balance-audit';

const TRANSACTION_CHANGE_TYPES = new Set<string>([
  'transaction_create',
  'transaction_update',
  'transaction_delete',
  'transaction_import',
  'transaction_merge',
]);

const MONEY_EPSILON = 0.01;
const PAGE_SIZE = 1000;

export interface RebuildCategoryAuditOptions {
  accountId: number;
  categoryId?: number;
  dryRun?: boolean;
}

export interface CategoryAuditRebuildDetail {
  categoryId: number;
  categoryName: string;
  previousAuditCount: number;
  newAuditCount: number;
  currentBalance: number;
  previousAuditBalance: number | null;
  openingBackfillAmount: number;
  transactionEventCount: number;
  preservedEventCount: number;
  rebuilt: boolean;
  skippedReason?: string;
}

export interface RebuildCategoryAuditResult {
  categoriesProcessed: number;
  categoriesSkipped: number;
  categoriesRebuilt: number;
  details: CategoryAuditRebuildDetail[];
}

interface AuditEvent {
  sortKey: string;
  createdAt: string;
  changeAmount: number;
  changeType: BalanceChangeType;
  transactionId: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
}

interface ExistingAuditRecord {
  id: number;
  change_type: string;
  change_amount: number;
  old_balance: number;
  new_balance: number;
  transaction_id: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface TransactionSplitRow {
  id: number;
  category_id: number;
  amount: number;
  transaction_id: number;
  transactions: {
    id: number;
    date: string;
    description: string;
    transaction_type: 'income' | 'expense' | null;
    is_historical: boolean | null;
    created_at: string;
    updated_at: string;
    budget_account_id: number;
  };
}

interface CategoryRow {
  id: number;
  name: string;
  current_balance: number;
  is_system: boolean | null;
  is_buffer: boolean | null;
  account_id: number;
  created_at: string;
}

interface AuditInsertRow {
  category_id: number;
  account_id: number;
  user_id: string;
  old_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: BalanceChangeType;
  transaction_id: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function moneyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < MONEY_EPSILON;
}

function getEffectiveSortKey(createdAt: string, transactionDate?: string | null): string {
  if (transactionDate) {
    const dateOnly = transactionDate.slice(0, 10);
    const timePart = createdAt.includes('T') ? createdAt.slice(11) : '12:00:00.000Z';
    return `${dateOnly}T${timePart}`;
  }
  return createdAt;
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function getLatestAuditBalance(records: ExistingAuditRecord[]): number | null {
  if (records.length === 0) return null;

  const sorted = [...records].sort((a, b) => {
    const aKey = getEffectiveSortKey(
      a.created_at,
      typeof a.metadata?.transaction_date === 'string' ? a.metadata.transaction_date : null
    );
    const bKey = getEffectiveSortKey(
      b.created_at,
      typeof b.metadata?.transaction_date === 'string' ? b.metadata.transaction_date : null
    );
    if (aKey !== bKey) return aKey.localeCompare(bKey);
    return a.id - b.id;
  });

  return roundMoney(Number(sorted[sorted.length - 1].new_balance));
}

function isAuditAlreadyConsistent(
  currentBalance: number,
  records: ExistingAuditRecord[]
): boolean {
  if (records.length === 0) {
    return moneyEqual(currentBalance, 0);
  }

  const sorted = [...records].sort((a, b) => {
    const aKey = getEffectiveSortKey(
      a.created_at,
      typeof a.metadata?.transaction_date === 'string' ? a.metadata.transaction_date : null
    );
    const bKey = getEffectiveSortKey(
      b.created_at,
      typeof b.metadata?.transaction_date === 'string' ? b.metadata.transaction_date : null
    );
    if (aKey !== bKey) return aKey.localeCompare(bKey);
    return a.id - b.id;
  });

  let runningBalance = roundMoney(Number(sorted[0].old_balance));

  for (const record of sorted) {
    const oldBalance = roundMoney(Number(record.old_balance));
    const newBalance = roundMoney(Number(record.new_balance));
    const changeAmount = roundMoney(Number(record.change_amount));

    if (!moneyEqual(oldBalance, runningBalance)) {
      return false;
    }
    if (!moneyEqual(newBalance, roundMoney(oldBalance + changeAmount))) {
      return false;
    }
    runningBalance = newBalance;
  }

  return moneyEqual(runningBalance, currentBalance);
}

async function getAccountOwnerId(
  supabase: SupabaseClient,
  accountId: number
): Promise<string> {
  const { data, error } = await supabase
    .from('budget_accounts')
    .select('owner_id')
    .eq('id', accountId)
    .single();

  if (error || !data?.owner_id) {
    throw new Error(`Could not resolve owner for account ${accountId}`);
  }

  return data.owner_id;
}

async function buildTransactionEvents(
  supabase: SupabaseClient,
  accountId: number,
  categoryId: number
): Promise<AuditEvent[]> {
  const splits = await fetchAllRows<TransactionSplitRow>((from, to) =>
    supabase
      .from('transaction_splits')
      .select(`
        id,
        category_id,
        amount,
        transaction_id,
        transactions!inner (
          id,
          date,
          description,
          transaction_type,
          is_historical,
          created_at,
          updated_at,
          budget_account_id
        )
      `)
      .eq('category_id', categoryId)
      .eq('transactions.budget_account_id', accountId)
      .order('id', { ascending: true })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as TransactionSplitRow[] | null, error }))
  );

  const activeSplits = splits.filter((split) => !split.transactions?.is_historical);
  if (activeSplits.length === 0) {
    return [];
  }

  const transactionIds = Array.from(new Set(activeSplits.map((split) => split.transaction_id)));
  const importedTransactionIds = new Set<number>();

  for (let i = 0; i < transactionIds.length; i += PAGE_SIZE) {
    const batch = transactionIds.slice(i, i + PAGE_SIZE);
    const { data, error } = await supabase
      .from('imported_transaction_links')
      .select('transaction_id')
      .in('transaction_id', batch);

    if (error) throw error;
    for (const row of data ?? []) {
      if (row.transaction_id) {
        importedTransactionIds.add(row.transaction_id);
      }
    }
  }

  return activeSplits.map((split) => {
    const transaction = split.transactions;
    const transactionType = transaction.transaction_type || 'expense';
    const splitAmount = roundMoney(Math.abs(Number(split.amount)));
    const changeAmount =
      transactionType === 'income' ? splitAmount : -splitAmount;
    const createdAt = transaction.updated_at || transaction.created_at;
    const isImport = importedTransactionIds.has(transaction.id);

    return {
      sortKey: getEffectiveSortKey(createdAt, transaction.date),
      createdAt,
      changeAmount,
      changeType: (isImport ? 'transaction_import' : 'transaction_create') as BalanceChangeType,
      transactionId: transaction.id,
      description: transaction.description,
      metadata: {
        transaction_date: transaction.date,
        transaction_type: transactionType,
        split_amount: splitAmount,
        rebuilt_from_current_state: true,
      },
    };
  });
}

function buildPreservedEvents(records: ExistingAuditRecord[]): AuditEvent[] {
  return records
    .filter((record) => !TRANSACTION_CHANGE_TYPES.has(record.change_type))
    .map((record) => ({
      sortKey: getEffectiveSortKey(
        record.created_at,
        typeof record.metadata?.transaction_date === 'string'
          ? record.metadata.transaction_date
          : null
      ),
      createdAt: record.created_at,
      changeAmount: roundMoney(Number(record.change_amount)),
      changeType: record.change_type as BalanceChangeType,
      transactionId: record.transaction_id,
      description: record.description,
      metadata: record.metadata,
    }));
}

function buildAuditRows(
  categoryId: number,
  accountId: number,
  userId: string,
  currentBalance: number,
  events: AuditEvent[],
  categoryCreatedAt: string
): AuditInsertRow[] {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey.localeCompare(b.sortKey);
    return a.createdAt.localeCompare(b.createdAt);
  });

  const eventTotal = roundMoney(sortedEvents.reduce((sum, event) => sum + event.changeAmount, 0));
  const openingAmount = roundMoney(currentBalance - eventTotal);
  const rows: AuditInsertRow[] = [];
  let runningBalance = 0;

  if (!moneyEqual(openingAmount, 0)) {
    const anchorEvent = sortedEvents[0];
    rows.push({
      category_id: categoryId,
      account_id: accountId,
      user_id: userId,
      old_balance: 0,
      new_balance: openingAmount,
      change_amount: openingAmount,
      change_type: 'audit_backfill',
      transaction_id: null,
      description: 'Reconciled starting balance for balance history',
      metadata: {
        backfill: true,
        reason: 'opening_balance',
        rebuilt_from_current_state: true,
        transaction_date: anchorEvent?.metadata?.transaction_date ?? categoryCreatedAt.slice(0, 10),
      },
      created_at: anchorEvent?.createdAt ?? categoryCreatedAt,
    });
    runningBalance = openingAmount;
  }

  for (const event of sortedEvents) {
    const oldBalance = runningBalance;
    const newBalance = roundMoney(oldBalance + event.changeAmount);
    rows.push({
      category_id: categoryId,
      account_id: accountId,
      user_id: userId,
      old_balance: oldBalance,
      new_balance: newBalance,
      change_amount: event.changeAmount,
      change_type: event.changeType,
      transaction_id: event.transactionId,
      description: event.description,
      metadata: event.metadata,
      created_at: event.createdAt,
    });
    runningBalance = newBalance;
  }

  if (!moneyEqual(runningBalance, currentBalance)) {
    throw new Error(
      `Rebuild failed for category ${categoryId}: running balance ${runningBalance} != current balance ${currentBalance}`
    );
  }

  return rows;
}

async function rebuildCategoryAudit(
  supabase: SupabaseClient,
  userId: string,
  category: CategoryRow,
  dryRun: boolean
): Promise<CategoryAuditRebuildDetail> {
  const currentBalance = roundMoney(Number(category.current_balance));

  const existingAudit = await fetchAllRows<ExistingAuditRecord>((from, to) =>
    supabase
      .from('category_balance_audit')
      .select('*')
      .eq('category_id', category.id)
      .eq('account_id', category.account_id)
      .order('id', { ascending: true })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as ExistingAuditRecord[] | null, error }))
  );

  const previousAuditBalance = getLatestAuditBalance(existingAudit);

  if (isAuditAlreadyConsistent(currentBalance, existingAudit)) {
    return {
      categoryId: category.id,
      categoryName: category.name,
      previousAuditCount: existingAudit.length,
      newAuditCount: existingAudit.length,
      currentBalance,
      previousAuditBalance,
      openingBackfillAmount: 0,
      transactionEventCount: 0,
      preservedEventCount: existingAudit.filter(
        (record) => !TRANSACTION_CHANGE_TYPES.has(record.change_type)
      ).length,
      rebuilt: false,
      skippedReason: 'Audit trail already matches envelope balance',
    };
  }

  const transactionEvents = await buildTransactionEvents(
    supabase,
    category.account_id,
    category.id
  );
  const preservedEvents = buildPreservedEvents(existingAudit);
  const allEvents = [...transactionEvents, ...preservedEvents];
  const newRows = buildAuditRows(
    category.id,
    category.account_id,
    userId,
    currentBalance,
    allEvents,
    category.created_at
  );
  const openingBackfillAmount = roundMoney(
    newRows.find((row) => row.change_type === 'audit_backfill')?.change_amount ?? 0
  );

  if (!dryRun) {
    const { error: deleteError } = await supabase
      .from('category_balance_audit')
      .delete()
      .eq('category_id', category.id)
      .eq('account_id', category.account_id);

    if (deleteError) throw deleteError;

    for (let i = 0; i < newRows.length; i += PAGE_SIZE) {
      const batch = newRows.slice(i, i + PAGE_SIZE);
      const { error: insertError } = await supabase
        .from('category_balance_audit')
        .insert(batch);

      if (insertError) throw insertError;
    }
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    previousAuditCount: existingAudit.length,
    newAuditCount: newRows.length,
    currentBalance,
    previousAuditBalance,
    openingBackfillAmount,
    transactionEventCount: transactionEvents.length,
    preservedEventCount: preservedEvents.length,
    rebuilt: true,
  };
}

export async function rebuildCategoryBalanceAudit(
  supabase: SupabaseClient,
  options: RebuildCategoryAuditOptions
): Promise<RebuildCategoryAuditResult> {
  const { accountId, categoryId, dryRun = false } = options;
  const userId = await getAccountOwnerId(supabase, accountId);

  let categoryQuery = supabase
    .from('categories')
    .select('id, name, current_balance, is_system, is_buffer, account_id, created_at')
    .eq('account_id', accountId)
    .order('id', { ascending: true });

  if (categoryId !== undefined) {
    categoryQuery = categoryQuery.eq('id', categoryId);
  }

  const { data: categories, error: categoriesError } = await categoryQuery;
  if (categoriesError) throw categoriesError;

  const eligibleCategories = ((categories ?? []) as CategoryRow[]).filter(
    (category) => !category.is_system && !category.is_buffer
  );
  if (categoryId !== undefined && eligibleCategories.length === 0) {
    throw new Error(`Category ${categoryId} not found or not eligible for rebuild`);
  }

  const details: CategoryAuditRebuildDetail[] = [];

  for (const category of eligibleCategories) {
    const detail = await rebuildCategoryAudit(supabase, userId, category, dryRun);
    details.push(detail);
  }

  return {
    categoriesProcessed: details.length,
    categoriesSkipped: details.filter((detail) => !detail.rebuilt).length,
    categoriesRebuilt: details.filter((detail) => detail.rebuilt).length,
    details,
  };
}

export function verifyAuditTrailBalances(
  currentBalance: number,
  rows: Array<Pick<AuditInsertRow, 'old_balance' | 'new_balance' | 'change_amount'>>
): boolean {
  if (rows.length === 0) {
    return moneyEqual(currentBalance, 0);
  }

  let runningBalance = roundMoney(rows[0].old_balance);
  for (const row of rows) {
    if (!moneyEqual(roundMoney(row.old_balance), runningBalance)) {
      return false;
    }
    if (!moneyEqual(roundMoney(row.new_balance), roundMoney(row.old_balance + row.change_amount))) {
      return false;
    }
    runningBalance = roundMoney(row.new_balance);
  }

  return moneyEqual(runningBalance, currentBalance);
}
