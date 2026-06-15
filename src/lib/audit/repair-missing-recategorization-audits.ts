import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

const CHARGE_CHANGE_TYPES = new Set([
  'transaction_create',
  'transaction_import',
  'transaction_update',
  'transaction_merge',
]);

type AuditRow = {
  id: number;
  category_id: number;
  account_id: number;
  user_id: string;
  transaction_id: number | null;
  old_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MissingReverseRepair = {
  sourceCategoryId: number;
  sourceCategoryName: string;
  destinationCategoryId: number;
  destinationCategoryName: string;
  transactionId: number;
  transactionDescription: string | null;
  applyAuditId: number;
  chargeAuditId: number;
  oldBalance: number;
  newBalance: number;
  changeAmount: number;
  createdAt: string;
};

export type RepairRecategorizationAuditResult = {
  applyEntriesScanned: number;
  repairsFound: number;
  repairsInserted: number;
  repairs: MissingReverseRepair[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function moneyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function getAccountOwnerId(
  supabase: SupabaseClient,
  accountId: number
): Promise<string> {
  const { data, error } = await supabase
    .from('account_users')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data?.user_id) return data.user_id;

  const { data: fallback, error: fallbackError } = await supabase
    .from('account_users')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  if (!fallback?.user_id) {
    throw new Error(`No active user found for account ${accountId}`);
  }

  return fallback.user_id;
}

function isApplyEntry(record: AuditRow): boolean {
  if (record.change_type !== 'transaction_update' || !record.transaction_id) {
    return false;
  }

  return record.metadata?.update_phase !== 'reverse';
}

function isReverseEntry(record: AuditRow): boolean {
  return (
    record.change_type === 'transaction_update' &&
    record.metadata?.update_phase === 'reverse'
  );
}

function isChargeEntry(record: AuditRow): boolean {
  if (!record.transaction_id) return false;
  if (isReverseEntry(record)) return false;
  if (!CHARGE_CHANGE_TYPES.has(record.change_type)) return false;
  if (
    record.change_type === 'transaction_update' &&
    record.metadata?.update_phase === 'apply'
  ) {
    return false;
  }
  return Math.abs(record.change_amount) >= 0.01;
}

function getPreviousCategoryIds(
  applyEntry: AuditRow,
  transactionAudits: AuditRow[],
  currentSplitCategoryIds: number[]
): number[] {
  const fromMetadata = applyEntry.metadata?.previous_category_ids;
  if (Array.isArray(fromMetadata) && fromMetadata.length > 0) {
    return fromMetadata
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
  }

  const destinationCategoryId = applyEntry.category_id;
  const transactionId = applyEntry.transaction_id!;

  return Array.from(
    new Set(
      transactionAudits
        .filter(
          (record) =>
            record.transaction_id === transactionId &&
            record.category_id !== destinationCategoryId &&
            !currentSplitCategoryIds.includes(record.category_id) &&
            isChargeEntry(record)
        )
        .map((record) => record.category_id)
    )
  );
}

function findChargeEntry(
  sourceCategoryId: number,
  transactionId: number,
  applyCreatedAt: string,
  auditsByCategory: Map<number, AuditRow[]>
): AuditRow | null {
  const records = auditsByCategory.get(sourceCategoryId) ?? [];
  const candidates = records
    .filter(
      (record) =>
        record.transaction_id === transactionId &&
        isChargeEntry(record) &&
        record.created_at <= applyCreatedAt
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return candidates[0] ?? null;
}

function hasReverseEntry(
  sourceCategoryId: number,
  transactionId: number,
  auditsByCategory: Map<number, AuditRow[]>
): boolean {
  const records = auditsByCategory.get(sourceCategoryId) ?? [];
  return records.some(
    (record) =>
      record.transaction_id === transactionId && isReverseEntry(record)
  );
}

function buildRepair(
  applyEntry: AuditRow,
  sourceCategoryId: number,
  sourceCategoryName: string,
  destinationCategoryName: string,
  chargeEntry: AuditRow
): MissingReverseRepair {
  const applyCreatedAt = new Date(applyEntry.created_at);
  const reverseCreatedAt = new Date(applyCreatedAt.getTime() - 100).toISOString();

  return {
    sourceCategoryId,
    sourceCategoryName,
    destinationCategoryId: applyEntry.category_id,
    destinationCategoryName,
    transactionId: applyEntry.transaction_id!,
    transactionDescription:
      applyEntry.description ??
      (typeof applyEntry.metadata?.transaction_description === 'string'
        ? applyEntry.metadata.transaction_description
        : null),
    applyAuditId: applyEntry.id,
    chargeAuditId: chargeEntry.id,
    oldBalance: roundMoney(Number(chargeEntry.new_balance)),
    newBalance: roundMoney(Number(chargeEntry.old_balance)),
    changeAmount: roundMoney(
      Number(chargeEntry.old_balance) - Number(chargeEntry.new_balance)
    ),
    createdAt: reverseCreatedAt,
  };
}

export async function repairMissingRecategorizationAudits(
  supabase: SupabaseClient,
  options: {
    accountId: number;
    categoryId?: number;
    dryRun?: boolean;
  }
): Promise<RepairRecategorizationAuditResult> {
  const { accountId, categoryId, dryRun = false } = options;

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('account_id', accountId);

  if (categoriesError) throw categoriesError;

  const categoryNameById = new Map<number, string>(
    (categories ?? []).map((category) => [category.id, category.name])
  );

  let auditQuery = supabase
    .from('category_balance_audit')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  const auditRecords = await fetchAllRows<AuditRow>(async (from, to) => {
    const { data, error } = await auditQuery.range(from, to);
    return { data: data as AuditRow[] | null, error };
  });

  const applyEntries = auditRecords.filter(
    (record) => isApplyEntry(record) && record.transaction_id
  );

  const transactionIds = Array.from(
    new Set(applyEntries.map((entry) => entry.transaction_id!))
  );

  const currentSplitCategoryIdsByTransaction = new Map<number, number[]>();
  for (let i = 0; i < transactionIds.length; i += PAGE_SIZE) {
    const batch = transactionIds.slice(i, i + PAGE_SIZE);
    const { data: splits, error: splitsError } = await supabase
      .from('transaction_splits')
      .select('transaction_id, category_id, transactions!inner(budget_account_id)')
      .in('transaction_id', batch)
      .eq('transactions.budget_account_id', accountId);

    if (splitsError) throw splitsError;

    for (const split of splits ?? []) {
      const transactionId = split.transaction_id as number;
      const existing = currentSplitCategoryIdsByTransaction.get(transactionId) ?? [];
      existing.push(split.category_id as number);
      currentSplitCategoryIdsByTransaction.set(transactionId, existing);
    }
  }

  const auditsByTransaction = new Map<number, AuditRow[]>();
  for (const record of auditRecords) {
    if (!record.transaction_id) continue;
    const existing = auditsByTransaction.get(record.transaction_id) ?? [];
    existing.push(record);
    auditsByTransaction.set(record.transaction_id, existing);
  }

  const auditsByCategory = new Map<number, AuditRow[]>();
  for (const record of auditRecords) {
    const existing = auditsByCategory.get(record.category_id) ?? [];
    existing.push(record);
    auditsByCategory.set(record.category_id, existing);
  }

  const repairs: MissingReverseRepair[] = [];
  const repairKeys = new Set<string>();

  for (const applyEntry of applyEntries) {
    const transactionId = applyEntry.transaction_id!;
    const transactionAudits = auditsByTransaction.get(transactionId) ?? [];
    const currentSplitCategoryIds =
      currentSplitCategoryIdsByTransaction.get(transactionId) ?? [];

    const previousCategoryIds = getPreviousCategoryIds(
      applyEntry,
      transactionAudits,
      currentSplitCategoryIds
    );

    for (const sourceCategoryId of previousCategoryIds) {
      if (sourceCategoryId === applyEntry.category_id) continue;
      if (currentSplitCategoryIds.includes(sourceCategoryId)) continue;
      if (hasReverseEntry(sourceCategoryId, transactionId, auditsByCategory)) continue;

      const chargeEntry = findChargeEntry(
        sourceCategoryId,
        transactionId,
        applyEntry.created_at,
        auditsByCategory
      );
      if (!chargeEntry) continue;

      const expectedApplyAmount = roundMoney(Math.abs(Number(applyEntry.change_amount)));
      const chargeAmount = roundMoney(Math.abs(Number(chargeEntry.change_amount)));
      if (!moneyEqual(expectedApplyAmount, chargeAmount)) continue;

      const repairKey = `${sourceCategoryId}:${transactionId}:${applyEntry.id}`;
      if (repairKeys.has(repairKey)) continue;
      repairKeys.add(repairKey);

      repairs.push(
        buildRepair(
          applyEntry,
          sourceCategoryId,
          categoryNameById.get(sourceCategoryId) ?? `#${sourceCategoryId}`,
          categoryNameById.get(applyEntry.category_id) ?? `#${applyEntry.category_id}`,
          chargeEntry
        )
      );
    }
  }

  const scopedRepairs =
    categoryId === undefined
      ? repairs
      : repairs.filter((repair) => repair.sourceCategoryId === categoryId);

  if (!dryRun && scopedRepairs.length > 0) {
    const userId = await getAccountOwnerId(supabase, accountId);

    for (const repair of scopedRepairs) {
      const applyEntry = applyEntries.find((entry) => entry.id === repair.applyAuditId);
      const chargeEntry = auditRecords.find((entry) => entry.id === repair.chargeAuditId);
      if (!applyEntry || !chargeEntry) continue;

      const { error: insertError } = await supabase.from('category_balance_audit').insert({
        category_id: repair.sourceCategoryId,
        account_id: accountId,
        user_id: userId,
        old_balance: repair.oldBalance,
        new_balance: repair.newBalance,
        change_amount: repair.changeAmount,
        change_type: 'transaction_update',
        transaction_id: repair.transactionId,
        description: repair.transactionDescription,
        created_at: repair.createdAt,
        metadata: {
          transaction_id: repair.transactionId,
          transaction_description: repair.transactionDescription,
          transaction_date:
            applyEntry.metadata?.transaction_date ??
            chargeEntry.metadata?.transaction_date ??
            null,
          update_phase: 'reverse',
          split_amount: Math.abs(Number(chargeEntry.change_amount)),
          transaction_type:
            applyEntry.metadata?.transaction_type ??
            chargeEntry.metadata?.transaction_type ??
            'expense',
          new_category_ids: currentSplitCategoryIdsByTransaction.get(repair.transactionId) ?? [
            repair.destinationCategoryId,
          ],
          repaired_missing_reverse: true,
          repaired_from_apply_audit_id: repair.applyAuditId,
          repaired_from_charge_audit_id: repair.chargeAuditId,
        },
      });

      if (insertError) throw insertError;
    }
  }

  return {
    applyEntriesScanned: applyEntries.length,
    repairsFound: scopedRepairs.length,
    repairsInserted: dryRun ? 0 : scopedRepairs.length,
    repairs: scopedRepairs,
  };
}

export async function categoryAuditTrailEndsAtCurrentBalance(
  supabase: SupabaseClient,
  accountId: number,
  categoryId: number
): Promise<{
  currentBalance: number;
  latestAuditBalance: number | null;
  matches: boolean;
}> {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('current_balance')
    .eq('id', categoryId)
    .eq('account_id', accountId)
    .single();

  if (categoryError) throw categoryError;

  const { data: latestAudit, error: auditError } = await supabase
    .from('category_balance_audit')
    .select('new_balance')
    .eq('category_id', categoryId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (auditError) throw auditError;

  const currentBalance = roundMoney(Number(category.current_balance));
  const latestAuditBalance =
    latestAudit?.new_balance === undefined || latestAudit?.new_balance === null
      ? null
      : roundMoney(Number(latestAudit.new_balance));

  return {
    currentBalance,
    latestAuditBalance,
    matches:
      latestAuditBalance === null
        ? moneyEqual(currentBalance, 0)
        : moneyEqual(currentBalance, latestAuditBalance),
  };
}
