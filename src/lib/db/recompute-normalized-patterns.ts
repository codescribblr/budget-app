import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeGlobalMerchantPattern } from '@/lib/merchant-pattern-normalize';
import { syncTransactionsForPatterns } from '@/lib/db/sync-merchant-groups';

export type RecomputePhase =
  | 'recompute_global'
  | 'recompute_mappings'
  | 'inherit';

export type RecomputeNormalizedPatternsResult = {
  phase: RecomputePhase;
  scanned: number;
  updated: number;
  inherited: number;
  synced_patterns: number;
  transactions_updated: number;
  groups_created: number;
  next_cursor: number | null;
  done: boolean;
};

/**
 * Batched replacement for the heavy DML that used to live in migration 127.
 *
 * Phases (call repeatedly until `done`):
 * 1. recompute_global — refresh global_merchant_patterns.normalized_pattern
 * 2. recompute_mappings — refresh merchant_mappings.normalized_pattern (UPPER)
 * 3. inherit — map ungrouped patterns onto a merchant sharing the same
 *    normalized form; optionally sync matching transactions
 *
 * After inherit is done, run POST …/backfill-unlinked for remaining null groups.
 */
export async function recomputeNormalizedPatternsBatch(options?: {
  phase?: RecomputePhase;
  cursor?: number | null;
  limit?: number;
  sync?: boolean;
}): Promise<RecomputeNormalizedPatternsResult> {
  const phase: RecomputePhase = options?.phase ?? 'recompute_global';
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 2000);
  const cursor = options?.cursor != null && options.cursor > 0 ? options.cursor : 0;
  const sync = options?.sync !== false;

  if (phase === 'recompute_global') {
    return recomputeGlobalPatterns(cursor, limit);
  }
  if (phase === 'recompute_mappings') {
    return recomputeMerchantMappings(cursor, limit);
  }
  return inheritUngroupedPatterns(cursor, limit, sync);
}

function emptyResult(
  phase: RecomputePhase,
  overrides: Partial<RecomputeNormalizedPatternsResult> = {}
): RecomputeNormalizedPatternsResult {
  return {
    phase,
    scanned: 0,
    updated: 0,
    inherited: 0,
    synced_patterns: 0,
    transactions_updated: 0,
    groups_created: 0,
    next_cursor: null,
    done: true,
    ...overrides,
  };
}

async function recomputeGlobalPatterns(
  cursor: number,
  limit: number
): Promise<RecomputeNormalizedPatternsResult> {
  const supabase = createServiceRoleClient();

  const { data: rows, error } = await supabase
    .from('global_merchant_patterns')
    .select('id, pattern, normalized_pattern')
    .gt('id', cursor)
    .order('id', { ascending: true })
    .limit(limit);

  if (error) throw error;

  if (!rows || rows.length === 0) {
    return emptyResult('recompute_global');
  }

  let updated = 0;
  for (const row of rows) {
    if (!row.pattern || !String(row.pattern).trim()) continue;
    const next = normalizeGlobalMerchantPattern(row.pattern);
    if (!next || next === row.normalized_pattern) continue;
    const { error: updateError } = await supabase
      .from('global_merchant_patterns')
      .update({
        normalized_pattern: next,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (updateError) {
      console.error('recompute_global update failed', row.id, updateError);
      continue;
    }
    updated++;
  }

  const nextCursor = rows[rows.length - 1].id as number;
  const done = rows.length < limit;

  return emptyResult('recompute_global', {
    scanned: rows.length,
    updated,
    next_cursor: done ? null : nextCursor,
    done,
  });
}

async function recomputeMerchantMappings(
  cursor: number,
  limit: number
): Promise<RecomputeNormalizedPatternsResult> {
  const supabase = createServiceRoleClient();

  const { data: rows, error } = await supabase
    .from('merchant_mappings')
    .select('id, pattern, normalized_pattern')
    .gt('id', cursor)
    .order('id', { ascending: true })
    .limit(limit);

  if (error) throw error;

  if (!rows || rows.length === 0) {
    return emptyResult('recompute_mappings');
  }

  let updated = 0;
  for (const row of rows) {
    if (!row.pattern || !String(row.pattern).trim()) continue;
    // Match SQL twin: upper(normalize_merchant_pattern(pattern))
    const next = normalizeGlobalMerchantPattern(row.pattern).toUpperCase();
    if (!next || next === row.normalized_pattern) continue;
    const { error: updateError } = await supabase
      .from('merchant_mappings')
      .update({
        normalized_pattern: next,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (updateError) {
      console.error('recompute_mappings update failed', row.id, updateError);
      continue;
    }
    updated++;
  }

  const nextCursor = rows[rows.length - 1].id as number;
  const done = rows.length < limit;

  return emptyResult('recompute_mappings', {
    scanned: rows.length,
    updated,
    next_cursor: done ? null : nextCursor,
    done,
  });
}

async function inheritUngroupedPatterns(
  cursor: number,
  limit: number,
  sync: boolean
): Promise<RecomputeNormalizedPatternsResult> {
  const supabase = createServiceRoleClient();

  const { data: ungrouped, error } = await supabase
    .from('global_merchant_patterns')
    .select('id, normalized_pattern')
    .is('global_merchant_id', null)
    .gt('id', cursor)
    .order('id', { ascending: true })
    .limit(limit);

  if (error) throw error;

  if (!ungrouped || ungrouped.length === 0) {
    return emptyResult('inherit');
  }

  const byMerchant = new Map<number, number[]>();
  let inherited = 0;

  for (const row of ungrouped) {
    const norm = (row.normalized_pattern || '').trim();
    if (!norm) continue;

    const { data: mapped } = await supabase
      .from('global_merchant_patterns')
      .select('global_merchant_id, usage_count, id')
      .eq('normalized_pattern', norm)
      .not('global_merchant_id', 'is', null)
      .order('usage_count', { ascending: false })
      .limit(5);

    const merchantId = mapped?.[0]?.global_merchant_id;
    if (merchantId == null) continue;

    const { error: updateError } = await supabase
      .from('global_merchant_patterns')
      .update({
        global_merchant_id: merchantId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .is('global_merchant_id', null);

    if (updateError) {
      console.error('inherit update failed', row.id, updateError);
      continue;
    }

    inherited++;
    const list = byMerchant.get(merchantId) ?? [];
    list.push(row.id);
    byMerchant.set(merchantId, list);
  }

  let syncedPatterns = 0;
  let transactionsUpdated = 0;
  let groupsCreated = 0;

  if (sync && byMerchant.size > 0) {
    for (const [merchantId, patternIds] of byMerchant.entries()) {
      try {
        const syncResult = await syncTransactionsForPatterns(patternIds, merchantId);
        syncedPatterns += patternIds.length;
        transactionsUpdated += syncResult.transactionsUpdated;
        groupsCreated += syncResult.groupsCreated;
      } catch (err) {
        console.error(
          'inherit sync failed for merchant',
          merchantId,
          patternIds,
          err
        );
      }
    }
  }

  const nextCursor = ungrouped[ungrouped.length - 1].id as number;
  const done = ungrouped.length < limit;

  return emptyResult('inherit', {
    scanned: ungrouped.length,
    inherited,
    synced_patterns: syncedPatterns,
    transactions_updated: transactionsUpdated,
    groups_created: groupsCreated,
    next_cursor: done ? null : nextCursor,
    done,
  });
}
