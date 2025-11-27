import { createClient } from '@/lib/supabase/server';
import type { MerchantGroup, MerchantMapping, MerchantGroupWithStats } from '@/lib/types';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * Get all merchant groups for the current user
 */
export async function getMerchantGroups(): Promise<MerchantGroup[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .order('display_name');

  if (error) throw error;
  return data || [];
}

/**
 * Get merchant groups with statistics
 */
export async function getMerchantGroupsWithStats(): Promise<MerchantGroupWithStats[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  // Get all merchant groups
  const { data: groups, error: groupsError } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .order('display_name');

  if (groupsError) throw groupsError;
  if (!groups) return [];

  // Get mappings for each group
  const { data: mappings, error: mappingsError } = await supabase
    .from('merchant_mappings')
    .select('merchant_group_id, pattern, is_automatic')
    .eq('user_id', user.id)
    .eq('account_id', accountId);

  if (mappingsError) throw mappingsError;

  // Get transactions to calculate stats
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('description, total_amount, transaction_type')
    .eq('budget_account_id', accountId);

  if (transactionsError) throw transactionsError;

  // Build stats for each group
  const groupsWithStats: MerchantGroupWithStats[] = groups.map(group => {
    const groupMappings = mappings?.filter(m => m.merchant_group_id === group.id) || [];
    const patterns = new Set(groupMappings.map(m => m.pattern));
    
    // Find transactions matching this group's patterns
    const groupTransactions = transactions?.filter(t => patterns.has(t.description)) || [];
    const netTotal = groupTransactions.reduce((sum, t) => {
      const multiplier = t.transaction_type === 'income' ? -1 : 1;
      return sum + (Number(t.total_amount) * multiplier);
    }, 0);
    
    return {
      ...group,
      transaction_count: groupTransactions.length,
      total_amount: netTotal,
      unique_patterns: patterns.size,
      has_manual_mappings: groupMappings.some(m => !m.is_automatic),
    };
  });

  return groupsWithStats;
}

/**
 * Get merchant group statistics for reporting
 * Groups transactions by merchant group and returns aggregated data
 */
export async function getMerchantGroupStats(
  transactionIds?: number[]
): Promise<Array<{
  group_id: number;
  display_name: string;
  transaction_count: number;
  total_amount: number;
  average_amount: number;
  patterns: string[];
}>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  // Get all merchant mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('merchant_mappings')
    .select('merchant_group_id, pattern')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .not('merchant_group_id', 'is', null);

  if (mappingsError) throw mappingsError;
  if (!mappings || mappings.length === 0) return [];

  // Build pattern to group mapping
  const patternToGroup = new Map<string, number>();
  mappings.forEach(m => {
    if (m.merchant_group_id) {
      patternToGroup.set(m.pattern, m.merchant_group_id);
    }
  });

  // Get transactions
  let query = supabase
    .from('transactions')
    .select('id, description, total_amount, transaction_type')
    .eq('budget_account_id', accountId);

  if (transactionIds && transactionIds.length > 0) {
    query = query.in('id', transactionIds);
  }

  const { data: transactions, error: transactionsError } = await query;
  if (transactionsError) throw transactionsError;
  if (!transactions) return [];

  // Group transactions by merchant group
  const groupStats = new Map<number, {
    transaction_count: number;
    total_amount: number;
    patterns: Set<string>;
  }>();

  transactions.forEach(t => {
    const groupId = patternToGroup.get(t.description);
    if (groupId) {
      const current = groupStats.get(groupId) || {
        transaction_count: 0,
        total_amount: 0,
        patterns: new Set<string>(),
      };

      current.transaction_count++;
      // Expenses add, income subtracts
      const amount = (t as any).transaction_type === 'income'
        ? -(t.total_amount)
        : t.total_amount;
      current.total_amount += amount;
      current.patterns.add(t.description);

      groupStats.set(groupId, current);
    }
  });

  // Get group details
  const groupIds = Array.from(groupStats.keys());
  if (groupIds.length === 0) return [];

  const { data: groups, error: groupsError } = await supabase
    .from('merchant_groups')
    .select('id, display_name')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .in('id', groupIds);

  if (groupsError) throw groupsError;
  if (!groups) return [];

  // Combine stats with group details
  return groups.map(group => {
    const stats = groupStats.get(group.id)!;
    return {
      group_id: group.id,
      display_name: group.display_name,
      transaction_count: stats.transaction_count,
      total_amount: stats.total_amount,
      average_amount: stats.total_amount / stats.transaction_count,
      patterns: Array.from(stats.patterns),
    };
  }).sort((a, b) => b.total_amount - a.total_amount);
}

/**
 * Get a single merchant group by ID
 */
export async function getMerchantGroup(id: number): Promise<MerchantGroup | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return null;

  const { data, error } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
}

/**
 * Create a new merchant group
 * Handles duplicate key errors gracefully (can happen during parallel imports)
 */
export async function createMerchantGroup(displayName: string): Promise<MerchantGroup> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('merchant_groups')
    .insert({
      user_id: user.id,
      account_id: accountId,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate key error (can happen during parallel imports)
    if (error.code === '23505') {
      // Fetch the existing group
      const { data: existing, error: fetchError } = await supabase
        .from('merchant_groups')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('display_name', displayName)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw error; // If we can't find it, throw original error
      return existing;
    }
    throw error;
  }
  return data;
}

/**
 * Update a merchant group
 */
export async function updateMerchantGroup(
  id: number,
  displayName: string
): Promise<MerchantGroup> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('merchant_groups')
    .update({ display_name: displayName })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a merchant group
 */
export async function deleteMerchantGroup(id: number): Promise<void> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('merchant_groups')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Get all merchant mappings for the current user
 */
export async function getMerchantMappings(): Promise<MerchantMapping[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .order('pattern');

  if (error) throw error;
  return data || [];
}

/**
 * Get merchant mapping by pattern
 */
export async function getMerchantMappingByPattern(
  pattern: string
): Promise<MerchantMapping | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return null;

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select('*')
    .eq('pattern', pattern)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
}

/**
 * Get all mappings for a specific merchant group
 */
export async function getMappingsForGroup(groupId: number): Promise<MerchantMapping[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select('*')
    .eq('merchant_group_id', groupId)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .order('pattern');

  if (error) throw error;
  return data || [];
}

/**
 * Create a new merchant mapping
 */
export async function createMerchantMapping(
  pattern: string,
  normalizedPattern: string,
  merchantGroupId: number | null,
  isAutomatic: boolean = true,
  confidenceScore: number = 0
): Promise<MerchantMapping> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('merchant_mappings')
    .insert({
      user_id: user.id,
      account_id: accountId,
      pattern,
      normalized_pattern: normalizedPattern,
      merchant_group_id: merchantGroupId,
      is_automatic: isAutomatic,
      confidence_score: confidenceScore,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a merchant mapping
 */
export async function updateMerchantMapping(
  id: number,
  updates: {
    merchant_group_id?: number | null;
    is_automatic?: boolean;
    confidence_score?: number;
  }
): Promise<MerchantMapping> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('merchant_mappings')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a merchant mapping
 */
export async function deleteMerchantMapping(id: number): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('merchant_mappings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Get merchant group for a transaction description
 * Returns the group if found, null otherwise
 */
export async function getMerchantGroupForDescription(
  description: string
): Promise<MerchantGroup | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return null;

  // First, check for exact pattern match
  const { data: mapping, error: mappingError } = await supabase
    .from('merchant_mappings')
    .select('merchant_group_id')
    .eq('pattern', description)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .maybeSingle();

  if (mappingError && mappingError.code !== 'PGRST116') {
    throw mappingError;
  }

  if (mapping && mapping.merchant_group_id) {
    // Get the merchant group
    return await getMerchantGroup(mapping.merchant_group_id);
  }

  return null;
}

/**
 * Get or create merchant group for a transaction description
 * This is used during transaction import to automatically assign groups
 */
export async function getOrCreateMerchantGroup(
  description: string,
  autoCreate: boolean = true
): Promise<{ group: MerchantGroup | null; isNew: boolean; confidence: number }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check for exact pattern match first
  const existingGroup = await getMerchantGroupForDescription(description);
  if (existingGroup) {
    return { group: existingGroup, isNew: false, confidence: 1.0 };
  }

  if (!autoCreate) {
    return { group: null, isNew: false, confidence: 0 };
  }

  // No exact match - try to find similar groups
  const { normalizeMerchantName, findBestMatch, extractDisplayName, calculateConfidence } =
    await import('@/lib/merchant-grouping');

  const normalized = normalizeMerchantName(description);

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get all existing groups with their normalized patterns
  const { data: allMappings, error: mappingsError } = await supabase
    .from('merchant_mappings')
    .select('merchant_group_id, normalized_pattern')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .not('merchant_group_id', 'is', null);

  if (mappingsError) throw mappingsError;

  // Get unique groups with their patterns
  const groupPatterns = new Map<number, string>();
  allMappings?.forEach(m => {
    if (m.merchant_group_id && !groupPatterns.has(m.merchant_group_id)) {
      groupPatterns.set(m.merchant_group_id, m.normalized_pattern);
    }
  });

  // Get group details
  const { data: groups, error: groupsError } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .in('id', Array.from(groupPatterns.keys()));

  if (groupsError) throw groupsError;

  const groupsWithPatterns = groups?.map(g => ({
    id: g.id,
    display_name: g.display_name,
    normalized_pattern: groupPatterns.get(g.id) || '',
  })) || [];

  // Find best match
  const match = findBestMatch(description, groupsWithPatterns, 0.85);

  if (match) {
    // Found a similar group - create mapping
    const confidence = calculateConfidence(match.similarity);
    await createMerchantMapping(
      description,
      normalized,
      match.groupId,
      true, // automatic
      confidence
    );

    const group = await getMerchantGroup(match.groupId);
    return { group, isNew: false, confidence };
  }

  // No match found - create new group
  const displayName = extractDisplayName(description);
  const newGroup = await createMerchantGroup(displayName);

  await createMerchantMapping(
    description,
    normalized,
    newGroup.id,
    true, // automatic
    1.0 // perfect confidence for new group
  );

  return { group: newGroup, isNew: true, confidence: 1.0 };
}

