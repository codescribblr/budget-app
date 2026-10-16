import { createServiceRoleClient } from '@/lib/supabase/server';

export type SyncTransactionsForPatternsResult = {
  transactionsUpdated: number;
  groupsCreated: number;
  groupsRelinked: number;
};

/**
 * Sync transactions with global merchant patterns
 * When patterns are grouped under a global merchant, update all matching transactions.
 * Uses the service-role client so admin/API-key flows can update every affected user.
 *
 * Note: empty merchant-group cleanup is intentionally NOT run here — it is a
 * set-based weekly/admin job (see cleanup_empty_merchant_groups RPC).
 */
export async function syncTransactionsForPatterns(
  patternIds: number[],
  globalMerchantId: number
): Promise<SyncTransactionsForPatternsResult> {
  const supabase = createServiceRoleClient();
  const empty: SyncTransactionsForPatternsResult = {
    transactionsUpdated: 0,
    groupsCreated: 0,
    groupsRelinked: 0,
  };

  // Get the global merchant details
  const { data: globalMerchant, error: merchantError } = await supabase
    .from('global_merchants')
    .select('id, display_name, status')
    .eq('id', globalMerchantId)
    .eq('status', 'active')
    .single();

  if (merchantError || !globalMerchant) {
    throw new Error('Global merchant not found or not active');
  }

  // Get all patterns that were grouped
  const { data: patterns, error: patternsError } = await supabase
    .from('global_merchant_patterns')
    .select('pattern, normalized_pattern')
    .in('id', patternIds)
    .eq('global_merchant_id', globalMerchantId);

  if (patternsError) throw patternsError;
  if (!patterns || patterns.length === 0) {
    return empty;
  }

  const { normalizeGlobalMerchantPattern } = await import(
    '@/lib/merchant-pattern-normalize'
  );

  const patternSet = new Set(patterns.map((p) => p.pattern));
  const normalizedPatternSet = new Set(
    patterns
      .map((p) => p.normalized_pattern)
      .filter(Boolean)
      .concat(normalizeGlobalMerchantPattern(globalMerchant.display_name))
      .filter(Boolean)
  );

  // Get all users who have transactions matching these patterns
  const { data: allTransactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('id, description, user_id, budget_account_id, merchant_group_id, merchant_override_id')
    .or(
      `description.in.(${Array.from(patternSet)
        .map((p) => `"${p.replace(/"/g, '""')}"`)
        .join(',')})`
    );

  if (transactionsError) throw transactionsError;

  const matchingTransactions = (allTransactions || []).filter((tx) => {
    if (patternSet.has(tx.description)) return true;
    const normalized = normalizeGlobalMerchantPattern(tx.description);
    return Boolean(normalized) && normalizedPatternSet.has(normalized);
  });

  // Group transactions by user and account
  const transactionsByUser = new Map<string, Map<number, typeof matchingTransactions>>();
  for (const tx of matchingTransactions) {
    if (!tx.user_id || !tx.budget_account_id) continue;
    if (!transactionsByUser.has(tx.user_id)) {
      transactionsByUser.set(tx.user_id, new Map());
    }
    const accountMap = transactionsByUser.get(tx.user_id)!;
    if (!accountMap.has(tx.budget_account_id)) {
      accountMap.set(tx.budget_account_id, []);
    }
    accountMap.get(tx.budget_account_id)!.push(tx);
  }

  let transactionsUpdated = 0;
  let groupsCreated = 0;

  // Process each user/account combination from matching transactions
  for (const [userId, accountMap] of transactionsByUser.entries()) {
    for (const [accountId, transactions] of accountMap.entries()) {
      const userGroupId = await ensureCanonicalUserGroup(
        supabase,
        userId,
        accountId,
        globalMerchantId,
        globalMerchant.display_name,
        () => {
          groupsCreated++;
        }
      );
      if (userGroupId == null) continue;

      const transactionsToUpdate = transactions.filter((tx) => !tx.merchant_override_id);

      if (transactionsToUpdate.length > 0) {
        const transactionIds = transactionsToUpdate.map((tx) => tx.id);
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ merchant_group_id: userGroupId })
          .in('id', transactionIds);

        if (updateError) {
          console.error(`Error updating transactions for user ${userId}:`, updateError);
        } else {
          transactionsUpdated += transactionIds.length;
        }
      }
    }
  }

  // Re-link per-user groups whose normalized display name matches this merchant
  const groupsRelinked = await relinkGroupsByNormalizedName(
    supabase,
    globalMerchantId,
    globalMerchant.display_name,
    normalizedPatternSet
  );

  return {
    transactionsUpdated,
    groupsCreated,
    groupsRelinked,
  };
}

async function ensureCanonicalUserGroup(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  accountId: number,
  globalMerchantId: number,
  displayName: string,
  onCreated: () => void
): Promise<number | null> {
  const { data: existingGroup } = await supabase
    .from('merchant_groups')
    .select('id, global_merchant_id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('global_merchant_id', globalMerchantId)
    .maybeSingle();

  if (existingGroup) {
    return existingGroup.id;
  }

  const { data: existingGroupByName } = await supabase
    .from('merchant_groups')
    .select('id, global_merchant_id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('display_name', displayName)
    .maybeSingle();

  if (existingGroupByName) {
    const { error: updateError } = await supabase
      .from('merchant_groups')
      .update({ global_merchant_id: globalMerchantId })
      .eq('id', existingGroupByName.id);

    if (updateError) {
      console.error(`Error updating merchant group for user ${userId}:`, updateError);
      return null;
    }
    return existingGroupByName.id;
  }

  const { data: newGroup, error: createError } = await supabase
    .from('merchant_groups')
    .insert({
      user_id: userId,
      account_id: accountId,
      display_name: displayName,
      global_merchant_id: globalMerchantId,
    })
    .select()
    .single();

  if (createError) {
    console.error(`Error creating merchant group for user ${userId}:`, createError);
    return null;
  }
  onCreated();
  return newGroup.id;
}

/**
 * Find unlinked (or differently linked) user groups whose display_name normalizes
 * to this global merchant, and re-link / merge them into the canonical group.
 */
async function relinkGroupsByNormalizedName(
  supabase: ReturnType<typeof createServiceRoleClient>,
  globalMerchantId: number,
  globalDisplayName: string,
  normalizedPatternSet: Set<string>
): Promise<number> {
  const { normalizeGlobalMerchantPattern } = await import(
    '@/lib/merchant-pattern-normalize'
  );
  const targetNorm = normalizeGlobalMerchantPattern(globalDisplayName);
  if (!targetNorm && normalizedPatternSet.size === 0) return 0;

  // Bound scan: unlinked groups first (location-split leftovers)
  const { data: candidates, error } = await supabase
    .from('merchant_groups')
    .select('id, user_id, account_id, display_name, global_merchant_id')
    .is('global_merchant_id', null)
    .order('id', { ascending: true })
    .limit(5000);

  if (error) {
    console.error('Error loading candidate merchant groups for relink:', error);
    return 0;
  }

  let relinked = 0;

  for (const group of candidates ?? []) {
    const norm = normalizeGlobalMerchantPattern(group.display_name || '');
    if (!norm) continue;
    if (norm !== targetNorm && !normalizedPatternSet.has(norm)) continue;

    const canonicalId = await ensureCanonicalUserGroup(
      supabase,
      group.user_id,
      group.account_id,
      globalMerchantId,
      globalDisplayName,
      () => undefined
    );
    if (canonicalId == null) continue;

    if (canonicalId === group.id) {
      // Same row became canonical via name match — already linked
      const { error: linkSelf } = await supabase
        .from('merchant_groups')
        .update({
          global_merchant_id: globalMerchantId,
          display_name: globalDisplayName,
        })
        .eq('id', group.id);
      if (!linkSelf) relinked++;
      continue;
    }

    // Move transactions, mappings, and rules onto the canonical group
    await supabase
      .from('transactions')
      .update({ merchant_group_id: canonicalId })
      .eq('merchant_group_id', group.id);

    await supabase
      .from('merchant_mappings')
      .update({ merchant_group_id: canonicalId })
      .eq('merchant_group_id', group.id);

    await supabase
      .from('merchant_category_rules')
      .update({ merchant_group_id: canonicalId })
      .eq('merchant_group_id', group.id);

    await supabase
      .from('recurring_transactions')
      .update({ merchant_group_id: canonicalId })
      .eq('merchant_group_id', group.id);

    // Delete the now-empty location variant group
    const { error: deleteError } = await supabase
      .from('merchant_groups')
      .delete()
      .eq('id', group.id)
      .is('global_merchant_id', null);

    if (deleteError) {
      // If delete fails (still referenced), at least link it
      await supabase
        .from('merchant_groups')
        .update({
          global_merchant_id: globalMerchantId,
          display_name: globalDisplayName,
        })
        .eq('id', group.id);
    }

    relinked++;
  }

  return relinked;
}
