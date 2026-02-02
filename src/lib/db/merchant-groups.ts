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

  // Get all merchant groups with global merchant info
  const { data: groups, error: groupsError } = await supabase
    .from('merchant_groups')
    .select(`
      *,
      global_merchants (
        display_name,
        logo_url,
        icon_name,
        status
      )
    `)
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
      const multiplier = (t.transaction_type || 'expense') === 'income' ? -1 : 1;
      return sum + (Number(t.total_amount) * multiplier);
    }, 0);
    
    // Extract global merchant info
    const globalMerchant = Array.isArray(group.global_merchants)
      ? group.global_merchants[0]
      : group.global_merchants;
    const hasActiveGlobalMerchant = globalMerchant && globalMerchant.status === 'active';
    // Prefer global merchant name over user's merchant group name
    const displayName = hasActiveGlobalMerchant && globalMerchant.display_name
      ? globalMerchant.display_name
      : group.display_name;
    
    return {
      ...group,
      display_name: displayName,
      transaction_count: groupTransactions.length,
      total_amount: netTotal,
      unique_patterns: patterns.size,
      has_manual_mappings: groupMappings.some(m => !m.is_automatic),
      // Add global merchant logo/icon info
      logo_url: hasActiveGlobalMerchant ? globalMerchant.logo_url : null,
      icon_name: hasActiveGlobalMerchant ? globalMerchant.icon_name : null,
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
  logo_url?: string | null;
  icon_name?: string | null;
}>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  // Get transactions with their merchant_group_id
  // Use merchant_group_id directly instead of relying on merchant_mappings
  // (which may not exist after merchant groups were deleted)
  let query = supabase
    .from('transactions')
    .select('id, description, total_amount, transaction_type, merchant_group_id')
    .eq('budget_account_id', accountId)
    .not('merchant_group_id', 'is', null);

  if (transactionIds && transactionIds.length > 0) {
    query = query.in('id', transactionIds);
  }

  const { data: transactions, error: transactionsError } = await query;
  if (transactionsError) throw transactionsError;
  if (!transactions || transactions.length === 0) return [];

  // Group transactions by merchant group (using merchant_group_id directly)
  const groupStats = new Map<number, {
    transaction_count: number;
    total_amount: number;
    patterns: Set<string>;
  }>();

  transactions.forEach(t => {
    const groupId = (t as any).merchant_group_id;
    if (groupId) {
      const current = groupStats.get(groupId) || {
        transaction_count: 0,
        total_amount: 0,
        patterns: new Set<string>(),
      };

      current.transaction_count++;
      // Expenses add, income subtracts
      const amount = ((t as any).transaction_type || 'expense') === 'income'
        ? -(t.total_amount)
        : t.total_amount;
      current.total_amount += amount;
      current.patterns.add(t.description);

      groupStats.set(groupId, current);
    }
  });

  // Get group details with global merchant info
  const groupIds = Array.from(groupStats.keys());
  if (groupIds.length === 0) return [];

  const { data: groups, error: groupsError } = await supabase
    .from('merchant_groups')
    .select(`
      id,
      display_name,
      global_merchant_id,
      global_merchants (
        display_name,
        logo_url,
        icon_name,
        status
      )
    `)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .in('id', groupIds);

  if (groupsError) throw groupsError;
  if (!groups) return [];

  // Combine stats with group details
  return groups.map(group => {
    const stats = groupStats.get(group.id)!;
    const globalMerchant = Array.isArray(group.global_merchants)
      ? group.global_merchants[0]
      : group.global_merchants;
    const hasActiveGlobalMerchant = globalMerchant && globalMerchant.status === 'active';
    // Prefer global merchant name over user's merchant group name
    const displayName = hasActiveGlobalMerchant && globalMerchant.display_name
      ? globalMerchant.display_name
      : group.display_name;
    
    return {
      group_id: group.id,
      display_name: displayName,
      transaction_count: stats.transaction_count,
      total_amount: stats.total_amount,
      average_amount: stats.total_amount / stats.transaction_count,
      patterns: Array.from(stats.patterns),
      logo_url: hasActiveGlobalMerchant ? globalMerchant.logo_url : null,
      icon_name: hasActiveGlobalMerchant ? globalMerchant.icon_name : null,
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
 * Get global merchant info for a merchant group (if linked)
 */
export async function getGlobalMerchantForGroup(
  merchantGroupId: number
): Promise<{ logo_url: string | null; icon_name: string | null } | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return null;

  // Get the merchant group with its global merchant link
  const { data: group, error: groupError } = await supabase
    .from('merchant_groups')
    .select('global_merchant_id')
    .eq('id', merchantGroupId)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .maybeSingle();

  if (groupError && groupError.code !== 'PGRST116') {
    throw groupError;
  }

  if (!group?.global_merchant_id) {
    return null;
  }

  // Get the global merchant info
  const { data: globalMerchant, error: merchantError } = await supabase
    .from('global_merchants')
    .select('logo_url, icon_name, status')
    .eq('id', group.global_merchant_id)
    .eq('status', 'active')
    .maybeSingle();

  if (merchantError && merchantError.code !== 'PGRST116') {
    throw merchantError;
  }

  if (!globalMerchant) {
    return null;
  }

  return {
    logo_url: globalMerchant.logo_url,
    icon_name: globalMerchant.icon_name,
  };
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
 * Automatically links/unlinks to global merchants based on name match
 */
export async function updateMerchantGroup(
  id: number,
  displayName: string
): Promise<MerchantGroup> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get current group to check existing link
  const { data: currentGroup, error: fetchError } = await supabase
    .from('merchant_groups')
    .select('display_name, global_merchant_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .single();

  if (fetchError) throw fetchError;
  if (!currentGroup) throw new Error('Merchant group not found');

  // Check if new name matches a global merchant (case-insensitive exact match)
  const normalizedName = displayName.trim().toLowerCase();
  const { data: allActiveGlobalMerchants, error: globalError } = await supabase
    .from('global_merchants')
    .select('id, display_name, status')
    .eq('status', 'active');

  if (globalError && globalError.code !== 'PGRST116') {
    throw globalError;
  }

  // Find exact case-insensitive match
  const matchingGlobalMerchant = allActiveGlobalMerchants?.find(
    gm => gm.display_name.toLowerCase().trim() === normalizedName
  );

  // Determine the new global_merchant_id
  let newGlobalMerchantId: number | null = null;
  
  if (matchingGlobalMerchant) {
    // Name matches a global merchant - link to it
    newGlobalMerchantId = matchingGlobalMerchant.id;
  } else {
    // Name doesn't match any global merchant - unlink if currently linked
    newGlobalMerchantId = null;
  }

  // Update the merchant group with new name and global_merchant_id
  const updateData: any = { display_name: displayName.trim() };
  if (newGlobalMerchantId !== currentGroup.global_merchant_id) {
    updateData.global_merchant_id = newGlobalMerchantId;
  }

  const { data, error } = await supabase
    .from('merchant_groups')
    .update(updateData)
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
 * Handles duplicate key errors gracefully (can happen during parallel imports)
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

  if (error) {
    // Handle duplicate key error (can happen during parallel imports)
    if (error.code === '23505') {
      // Fetch the existing mapping
      const { data: existing, error: fetchError } = await supabase
        .from('merchant_mappings')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('pattern', pattern)
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
 * Check if a transaction description matches a global merchant pattern
 * Returns the global merchant if found, null otherwise
 */
async function getGlobalMerchantForDescription(
  description: string
): Promise<{ id: number; display_name: string; logo_url: string | null; icon_name: string | null } | null> {
  const supabase = await createClient();

  // Normalize the description (same logic as global merchant patterns)
  const normalized = description.toLowerCase().trim().replace(/\s+/g, ' ');

  // Check for exact pattern match first
  const { data: patternMatch, error: patternError } = await supabase
    .from('global_merchant_patterns')
    .select('global_merchant_id')
    .eq('pattern', description)
    .not('global_merchant_id', 'is', null)
    .maybeSingle();

  if (patternError && patternError.code !== 'PGRST116') {
    console.error('Error checking global merchant pattern:', patternError);
    return null;
  }

  let merchantId: number | null = null;
  if (patternMatch?.global_merchant_id) {
    merchantId = patternMatch.global_merchant_id;
  } else {
    // Check normalized pattern match
    const { data: normalizedMatch, error: normalizedError } = await supabase
      .from('global_merchant_patterns')
      .select('global_merchant_id')
      .eq('normalized_pattern', normalized)
      .not('global_merchant_id', 'is', null)
      .maybeSingle();

    if (normalizedError && normalizedError.code !== 'PGRST116') {
      console.error('Error checking normalized global merchant pattern:', normalizedError);
      return null;
    }

    if (normalizedMatch?.global_merchant_id) {
      merchantId = normalizedMatch.global_merchant_id;
    }
  }

  if (!merchantId) {
    return null;
  }

  // Get the merchant details (only active merchants)
  const { data: merchant, error: merchantError } = await supabase
    .from('global_merchants')
    .select('id, display_name, logo_url, icon_name, status')
    .eq('id', merchantId)
    .eq('status', 'active')
    .maybeSingle();

  if (merchantError && merchantError.code !== 'PGRST116') {
    console.error('Error fetching global merchant:', merchantError);
    return null;
  }

  if (merchant) {
    return {
      id: merchant.id,
      display_name: merchant.display_name,
      logo_url: merchant.logo_url,
      icon_name: merchant.icon_name,
    };
  }

  return null;
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

  // First, check for exact pattern match in user's mappings
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

  // Check for exact pattern match in user's mappings first (user overrides take precedence)
  const existingGroup = await getMerchantGroupForDescription(description);
  if (existingGroup) {
    return { group: existingGroup, isNew: false, confidence: 1.0 };
  }

  if (!autoCreate) {
    return { group: null, isNew: false, confidence: 0 };
  }

  // Check global merchants before creating new user groups
  const globalMerchant = await getGlobalMerchantForDescription(description);
  if (globalMerchant) {
    const accountId = await getActiveAccountId();
    if (!accountId) throw new Error('No active account');

    // Check if user already has a merchant group with this name (to avoid duplicates)
    const { data: existingUserGroup, error: groupCheckError } = await supabase
      .from('merchant_groups')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('display_name', globalMerchant.display_name)
      .maybeSingle();

    if (groupCheckError && groupCheckError.code !== 'PGRST116') {
      throw groupCheckError;
    }

    let userGroup: MerchantGroup;
    let isNewGroup = false;

    if (existingUserGroup) {
      // User already has a group with this name, use it
      userGroup = existingUserGroup as MerchantGroup;
    } else {
      // Create a new user-level merchant group with the global merchant's display name
      // Link it to the global merchant so logos/icons can be displayed
      const { data: newGroup, error: createError } = await supabase
        .from('merchant_groups')
        .insert({
          user_id: user.id,
          account_id: accountId,
          display_name: globalMerchant.display_name,
          global_merchant_id: globalMerchant.id,
        })
        .select()
        .single();

      if (createError) throw createError;
      userGroup = newGroup as MerchantGroup;
      isNewGroup = true;
    }

    // Check if mapping already exists (race condition check)
    const existingMapping = await getMerchantMappingByPattern(description);
    if (!existingMapping) {
      // Create mapping linking this pattern to the user's merchant group
      const { normalizeMerchantName } = await import('@/lib/merchant-grouping');
      const normalized = normalizeMerchantName(description);
      
      await createMerchantMapping(
        description,
        normalized,
        userGroup.id,
        true, // automatic
        1.0 // high confidence for global merchant match
      );
    }

    return { group: userGroup, isNew: isNewGroup, confidence: 1.0 };
  }

  // No global merchant match - try to find similar groups
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
    // Found a similar group - check if mapping already exists (race condition check)
    const existingMapping = await getMerchantMappingByPattern(description);
    if (existingMapping) {
      const group = await getMerchantGroup(existingMapping.merchant_group_id || match.groupId);
      return { group, isNew: false, confidence: calculateConfidence(match.similarity) };
    }

    // Create mapping
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

  // No match found - check if mapping already exists (race condition check)
  const existingMapping = await getMerchantMappingByPattern(description);
  if (existingMapping && existingMapping.merchant_group_id) {
    const group = await getMerchantGroup(existingMapping.merchant_group_id);
    return { group, isNew: false, confidence: 1.0 };
  }

  // Create new group
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


