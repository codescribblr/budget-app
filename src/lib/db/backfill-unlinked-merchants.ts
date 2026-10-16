import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeGlobalMerchantPattern } from '@/lib/merchant-pattern-normalize';
import { extractDisplayName, normalizeMerchantName } from '@/lib/merchant-grouping';

export type BackfillUnlinkedResult = {
  scanned: number;
  linked_global: number;
  fallback_created: number;
  still_unlinked: number;
  next_cursor: number | null;
  user_id: string | null;
};

export type UnlinkedStatsRow = {
  user_id: string;
  budget_account_id: number;
  unlinked_count: number;
};

/**
 * Page of transactions with no merchant group and no override.
 * Links each unique description to a global merchant (exact then normalized)
 * or creates a clean fallback per-user group. Stays under Vercel time limits
 * by processing at most `limit` rows per call.
 */
export async function backfillUnlinkedMerchantTransactions(options?: {
  userId?: string | null;
  limit?: number;
  cursor?: number | null;
}): Promise<BackfillUnlinkedResult> {
  const supabase = createServiceRoleClient();
  const userId = options?.userId?.trim() || null;
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 1000);
  const cursor = options?.cursor != null && options.cursor > 0 ? options.cursor : 0;

  let query = supabase
    .from('transactions')
    .select('id, user_id, budget_account_id, description')
    .is('merchant_group_id', null)
    .is('merchant_override_id', null)
    .gt('id', cursor)
    .order('id', { ascending: true })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  const result: BackfillUnlinkedResult = {
    scanned: rows?.length ?? 0,
    linked_global: 0,
    fallback_created: 0,
    still_unlinked: 0,
    next_cursor: null,
    user_id: userId,
  };

  if (!rows || rows.length === 0) {
    return result;
  }

  result.next_cursor = rows[rows.length - 1].id as number;

  // Group by user + account + exact description for efficient linking
  type Key = string;
  const groups = new Map<
    Key,
    { userId: string; accountId: number; description: string; ids: number[] }
  >();

  for (const row of rows) {
    if (!row.user_id || !row.budget_account_id || !row.description) {
      result.still_unlinked++;
      continue;
    }
    const key = `${row.user_id}|${row.budget_account_id}|${row.description}`;
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(row.id);
    } else {
      groups.set(key, {
        userId: row.user_id,
        accountId: row.budget_account_id,
        description: row.description,
        ids: [row.id],
      });
    }
  }

  for (const group of groups.values()) {
    try {
      const outcome = await linkDescriptionForUser(
        supabase,
        group.userId,
        group.accountId,
        group.description,
        group.ids
      );
      if (outcome === 'global') result.linked_global += group.ids.length;
      else if (outcome === 'fallback') result.fallback_created += group.ids.length;
      else result.still_unlinked += group.ids.length;
    } catch (err) {
      console.error('backfillUnlinked: failed for description', group.description, err);
      result.still_unlinked += group.ids.length;
    }
  }

  return result;
}

async function linkDescriptionForUser(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  accountId: number,
  description: string,
  transactionIds: number[]
): Promise<'global' | 'fallback' | 'failed'> {
  const normalized = normalizeGlobalMerchantPattern(description);

  // 1) Exact pattern → global merchant
  let globalMerchantId: number | null = null;
  const { data: exactPattern } = await supabase
    .from('global_merchant_patterns')
    .select('global_merchant_id')
    .eq('pattern', description)
    .not('global_merchant_id', 'is', null)
    .maybeSingle();

  if (exactPattern?.global_merchant_id) {
    globalMerchantId = exactPattern.global_merchant_id;
  } else if (normalized) {
    const { data: normMatches } = await supabase
      .from('global_merchant_patterns')
      .select('global_merchant_id')
      .eq('normalized_pattern', normalized)
      .not('global_merchant_id', 'is', null)
      .limit(1);
    if (normMatches?.[0]?.global_merchant_id) {
      globalMerchantId = normMatches[0].global_merchant_id;
    }
  }

  if (globalMerchantId != null) {
    const { data: merchant } = await supabase
      .from('global_merchants')
      .select('id, display_name, status')
      .eq('id', globalMerchantId)
      .eq('status', 'active')
      .maybeSingle();

    if (merchant) {
      await upsertGlobalPattern(supabase, description, normalized, merchant.id);
      const groupId = await ensureUserGroupForGlobal(
        supabase,
        userId,
        accountId,
        merchant.id,
        merchant.display_name
      );
      if (groupId != null) {
        await ensureUserMapping(supabase, userId, accountId, description, groupId);
        await updateTransactions(supabase, transactionIds, groupId);
        return 'global';
      }
    }
  }

  // 2) Fallback: clean per-user group from extractDisplayName
  const displayName = extractDisplayName(description) || description.trim() || 'Unknown';
  const groupId = await ensureFallbackUserGroup(supabase, userId, accountId, displayName);
  if (groupId == null) return 'failed';

  await ensureUserMapping(supabase, userId, accountId, description, groupId);
  // Still register the raw pattern (ungrouped) so future global mapping can find it
  await upsertGlobalPattern(supabase, description, normalized, null);
  await updateTransactions(supabase, transactionIds, groupId);
  return 'fallback';
}

async function upsertGlobalPattern(
  supabase: ReturnType<typeof createServiceRoleClient>,
  description: string,
  normalized: string,
  globalMerchantId: number | null
): Promise<void> {
  const { data: existing } = await supabase
    .from('global_merchant_patterns')
    .select('id, global_merchant_id')
    .eq('pattern', description)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
      normalized_pattern: normalized || description.toLowerCase().trim(),
    };
    if (globalMerchantId != null && existing.global_merchant_id == null) {
      updates.global_merchant_id = globalMerchantId;
    }
    await supabase.from('global_merchant_patterns').update(updates).eq('id', existing.id);
    return;
  }

  await supabase.from('global_merchant_patterns').insert({
    pattern: description,
    normalized_pattern: normalized || description.toLowerCase().trim(),
    global_merchant_id: globalMerchantId,
    usage_count: 1,
  });
}

async function ensureUserGroupForGlobal(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  accountId: number,
  globalMerchantId: number,
  displayName: string
): Promise<number | null> {
  const { data: byGlobal } = await supabase
    .from('merchant_groups')
    .select('id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('global_merchant_id', globalMerchantId)
    .maybeSingle();
  if (byGlobal?.id) return byGlobal.id;

  const { data: byName } = await supabase
    .from('merchant_groups')
    .select('id, global_merchant_id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('display_name', displayName)
    .maybeSingle();

  if (byName?.id) {
    if (byName.global_merchant_id !== globalMerchantId) {
      await supabase
        .from('merchant_groups')
        .update({ global_merchant_id: globalMerchantId })
        .eq('id', byName.id);
    }
    return byName.id;
  }

  const { data: created, error } = await supabase
    .from('merchant_groups')
    .insert({
      user_id: userId,
      account_id: accountId,
      display_name: displayName,
      global_merchant_id: globalMerchantId,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('merchant_groups')
        .select('id')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('display_name', displayName)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from('merchant_groups')
          .update({ global_merchant_id: globalMerchantId })
          .eq('id', existing.id);
        return existing.id;
      }
    }
    console.error('ensureUserGroupForGlobal insert failed:', error);
    return null;
  }

  return created.id;
}

async function ensureFallbackUserGroup(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  accountId: number,
  displayName: string
): Promise<number | null> {
  const { data: existing } = await supabase
    .from('merchant_groups')
    .select('id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('display_name', displayName)
    .maybeSingle();
  if (existing?.id) return existing.id;

  // Also match by normalized display name among unlinked groups
  const norm = normalizeGlobalMerchantPattern(displayName);
  if (norm) {
    const { data: candidates } = await supabase
      .from('merchant_groups')
      .select('id, display_name')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .is('global_merchant_id', null)
      .limit(200);
    const match = (candidates || []).find(
      (g) => normalizeGlobalMerchantPattern(g.display_name || '') === norm
    );
    if (match?.id) return match.id;
  }

  const { data: created, error } = await supabase
    .from('merchant_groups')
    .insert({
      user_id: userId,
      account_id: accountId,
      display_name: displayName,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: again } = await supabase
        .from('merchant_groups')
        .select('id')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('display_name', displayName)
        .maybeSingle();
      return again?.id ?? null;
    }
    console.error('ensureFallbackUserGroup insert failed:', error);
    return null;
  }

  return created.id;
}

async function ensureUserMapping(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  accountId: number,
  description: string,
  groupId: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('merchant_mappings')
    .select('id, merchant_group_id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('pattern', description)
    .maybeSingle();

  if (existing) {
    if (existing.merchant_group_id !== groupId) {
      await supabase
        .from('merchant_mappings')
        .update({ merchant_group_id: groupId })
        .eq('id', existing.id);
    }
    return;
  }

  await supabase.from('merchant_mappings').insert({
    user_id: userId,
    account_id: accountId,
    pattern: description,
    normalized_pattern: normalizeMerchantName(description),
    merchant_group_id: groupId,
    is_automatic: true,
    confidence_score: 1.0,
  });
}

async function updateTransactions(
  supabase: ReturnType<typeof createServiceRoleClient>,
  ids: number[],
  groupId: number
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('transactions')
    .update({ merchant_group_id: groupId })
    .in('id', ids)
    .is('merchant_group_id', null)
    .is('merchant_override_id', null);
  if (error) throw error;
}

/**
 * Counts of unlinked (no group, no override) transactions per user/account.
 */
export async function getUnlinkedMerchantStats(options?: {
  userId?: string | null;
}): Promise<{ rows: UnlinkedStatsRow[]; total_unlinked: number }> {
  const supabase = createServiceRoleClient();
  const userId = options?.userId?.trim() || null;

  // Prefer RPC if present; fall back to a bounded select+aggregate for compatibility
  const { data: rpcData, error: rpcError } = await supabase.rpc('unlinked_merchant_stats', {
    p_user_id: userId,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    const rows = rpcData as UnlinkedStatsRow[];
    return {
      rows,
      total_unlinked: rows.reduce((sum, r) => sum + Number(r.unlinked_count || 0), 0),
    };
  }

  // Fallback: page through and aggregate in memory (admin tooling only)
  const counts = new Map<string, UnlinkedStatsRow>();
  let cursor = 0;
  let total = 0;
  for (;;) {
    let query = supabase
      .from('transactions')
      .select('id, user_id, budget_account_id')
      .is('merchant_group_id', null)
      .is('merchant_override_id', null)
      .gt('id', cursor)
      .order('id', { ascending: true })
      .limit(2000);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (!row.user_id || !row.budget_account_id) continue;
      const key = `${row.user_id}|${row.budget_account_id}`;
      const existing = counts.get(key);
      if (existing) existing.unlinked_count++;
      else {
        counts.set(key, {
          user_id: row.user_id,
          budget_account_id: row.budget_account_id,
          unlinked_count: 1,
        });
      }
      total++;
    }
    cursor = data[data.length - 1].id as number;
    if (data.length < 2000) break;
  }

  return { rows: Array.from(counts.values()), total_unlinked: total };
}
