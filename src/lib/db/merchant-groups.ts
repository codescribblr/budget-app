import { createClient } from '@/lib/supabase/server';
import type { MerchantGroup, MerchantMapping, MerchantGroupWithStats } from '@/lib/types';

/**
 * Get all merchant groups for the current user
 */
export async function getMerchantGroups(): Promise<MerchantGroup[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('user_id', user.id)
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

  // Get all merchant groups
  const { data: groups, error: groupsError } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('user_id', user.id)
    .order('display_name');

  if (groupsError) throw groupsError;
  if (!groups) return [];

  // Get mappings for each group
  const { data: mappings, error: mappingsError } = await supabase
    .from('merchant_mappings')
    .select('merchant_group_id, pattern, is_automatic')
    .eq('user_id', user.id);

  if (mappingsError) throw mappingsError;

  // Get transactions to calculate stats
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('description, total_amount')
    .eq('user_id', user.id);

  if (transactionsError) throw transactionsError;

  // Build stats for each group
  const groupsWithStats: MerchantGroupWithStats[] = groups.map(group => {
    const groupMappings = mappings?.filter(m => m.merchant_group_id === group.id) || [];
    const patterns = new Set(groupMappings.map(m => m.pattern));
    
    // Find transactions matching this group's patterns
    const groupTransactions = transactions?.filter(t => patterns.has(t.description)) || [];
    
    return {
      ...group,
      transaction_count: groupTransactions.length,
      total_amount: groupTransactions.reduce((sum, t) => sum + t.total_amount, 0),
      unique_patterns: patterns.size,
      has_manual_mappings: groupMappings.some(m => !m.is_automatic),
    };
  });

  return groupsWithStats;
}

/**
 * Get a single merchant group by ID
 */
export async function getMerchantGroup(id: number): Promise<MerchantGroup | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
}

/**
 * Create a new merchant group
 */
export async function createMerchantGroup(displayName: string): Promise<MerchantGroup> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('merchant_groups')
    .insert({
      user_id: user.id,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) throw error;
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

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select('*')
    .eq('user_id', user.id)
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

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select('*')
    .eq('pattern', pattern)
    .eq('user_id', user.id)
    .single();

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

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select('*')
    .eq('merchant_group_id', groupId)
    .eq('user_id', user.id)
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

  const { data, error } = await supabase
    .from('merchant_mappings')
    .insert({
      user_id: user.id,
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

