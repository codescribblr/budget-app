import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * Sync transactions with global merchant patterns
 * When patterns are grouped under a global merchant, update all matching transactions
 */
export async function syncTransactionsForPatterns(
  patternIds: number[],
  globalMerchantId: number
): Promise<{ transactionsUpdated: number; groupsCreated: number }> {
  const supabase = await createClient();
  
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
    return { transactionsUpdated: 0, groupsCreated: 0 };
  }

  const patternSet = new Set(patterns.map(p => p.pattern));
  const normalizedPatternSet = new Set(patterns.map(p => p.normalized_pattern));

  // Get all users who have transactions matching these patterns
  const { data: allTransactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('id, description, user_id, budget_account_id, merchant_group_id, merchant_override_id')
    .or(
      `description.in.(${Array.from(patternSet).map(p => `"${p.replace(/"/g, '""')}"`).join(',')})`
    );

  if (transactionsError) throw transactionsError;
  if (!allTransactions || allTransactions.length === 0) {
    return { transactionsUpdated: 0, groupsCreated: 0 };
  }

  // Filter transactions that match patterns (exact or normalized)
  const matchingTransactions = (allTransactions || []).filter(tx => {
    if (patternSet.has(tx.description)) return true;
    const normalized = tx.description.toLowerCase().trim().replace(/\s+/g, ' ');
    return normalizedPatternSet.has(normalized);
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

  // Process each user/account combination
  for (const [userId, accountMap] of transactionsByUser.entries()) {
    for (const [accountId, transactions] of accountMap.entries()) {
      // Check if user already has a merchant group linked to this global merchant
      let { data: existingGroup } = await supabase
        .from('merchant_groups')
        .select('id, global_merchant_id')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('global_merchant_id', globalMerchantId)
        .maybeSingle();

      let userGroupId: number;
      if (existingGroup) {
        userGroupId = existingGroup.id;
      } else {
        // Check if user already has a merchant group with the same display name
        // (could be from old user-created group or previous migration)
        const { data: existingGroupByName } = await supabase
          .from('merchant_groups')
          .select('id, global_merchant_id')
          .eq('user_id', userId)
          .eq('account_id', accountId)
          .eq('display_name', globalMerchant.display_name)
          .maybeSingle();

        if (existingGroupByName) {
          // Update existing group to link to global merchant
          const { error: updateError } = await supabase
            .from('merchant_groups')
            .update({ global_merchant_id: globalMerchantId })
            .eq('id', existingGroupByName.id);

          if (updateError) {
            console.error(`Error updating merchant group for user ${userId}:`, updateError);
            continue;
          }
          userGroupId = existingGroupByName.id;
        } else {
          // Create new user merchant group linked to global merchant
          const { data: newGroup, error: createError } = await supabase
            .from('merchant_groups')
            .insert({
              user_id: userId,
              account_id: accountId,
              display_name: globalMerchant.display_name,
              global_merchant_id: globalMerchantId,
            })
            .select()
            .single();

          if (createError) {
            console.error(`Error creating merchant group for user ${userId}:`, createError);
            continue;
          }
          userGroupId = newGroup.id;
          groupsCreated++;
        }
      }

      // Update transactions (only if they don't have merchant_override_id)
      // Note: We don't create merchant_mappings here because global_merchant_patterns
      // already handle pattern-to-merchant mapping. User merchant groups are only
      // needed as a bridge for transaction.merchant_group_id references.
      const transactionsToUpdate = transactions.filter(tx => !tx.merchant_override_id);
      
      if (transactionsToUpdate.length > 0) {
        const transactionIds = transactionsToUpdate.map(tx => tx.id);
        
        // Update transactions to point to the user merchant group
        // The group is linked to the global merchant, so logos/icons will display correctly
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

  return { transactionsUpdated, groupsCreated };
}
