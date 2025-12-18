import { createClient } from '@/lib/supabase/server';
import type { Tag, TagWithStats } from '@/lib/types';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * Get all tags for the current account
 */
export async function getTags(includeStats: boolean = false): Promise<Tag[] | TagWithStats[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  if (includeStats) {
    return getTagsWithStats();
  }

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('account_id', accountId)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get tags with statistics (transaction count, total amount, last used)
 */
export async function getTagsWithStats(): Promise<TagWithStats[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  // Get all tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .eq('account_id', accountId)
    .order('name');

  if (tagsError) throw tagsError;
  if (!tags || tags.length === 0) return [];

  // Get transaction_tags for these tags
  const { data: transactionTags, error: ttError } = await supabase
    .from('transaction_tags')
    .select('tag_id, transactions!inner(id, total_amount, transaction_type, date, budget_account_id)')
    .eq('transactions.budget_account_id', accountId)
    .in('tag_id', tags.map(t => t.id));

  if (ttError) throw ttError;

  // Get transactions to calculate stats
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('id, total_amount, transaction_type, date')
    .eq('budget_account_id', accountId);

  if (transactionsError) throw transactionsError;

  // Build stats for each tag
  const tagsWithStats: TagWithStats[] = tags.map(tag => {
    // Find all transaction_tags for this tag
    const tagTransactionTags = transactionTags?.filter(tt => tt.tag_id === tag.id) || [];
    const transactionIds = new Set(tagTransactionTags.map(tt => (tt.transactions as any)?.id).filter(Boolean));
    
    // Calculate stats
    const tagTransactions = (transactions || []).filter(t => transactionIds.has(t.id));
    const netTotal = tagTransactions.reduce((sum, t) => {
      const multiplier = (t.transaction_type || 'expense') === 'income' ? -1 : 1;
      return sum + (Number(t.total_amount) * multiplier);
    }, 0);
    
    const lastUsed = tagTransactions.length > 0
      ? tagTransactions.reduce((latest, t) => {
          return !latest || t.date > latest ? t.date : latest;
        }, '' as string | null)
      : null;

    return {
      ...tag,
      transaction_count: tagTransactions.length,
      total_amount: netTotal,
      last_used: lastUsed,
    };
  });

  return tagsWithStats;
}

/**
 * Get total unique transactions and total amount across all tags
 * This is useful for summary statistics to avoid double-counting
 */
export async function getTotalUniqueTaggedTransactions(): Promise<number> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return 0;

  // Get all unique transaction IDs that have at least one tag
  const { data: transactionTags, error } = await supabase
    .from('transaction_tags')
    .select('transaction_id, transactions!inner(budget_account_id)')
    .eq('transactions.budget_account_id', accountId);

  if (error) throw error;

  // Get unique transaction IDs
  const uniqueTransactionIds = new Set(
    (transactionTags || []).map(tt => tt.transaction_id).filter(Boolean)
  );

  return uniqueTransactionIds.size;
}

/**
 * Get total amount for all unique tagged transactions
 * This avoids double-counting transactions with multiple tags
 */
export async function getTotalUniqueTaggedAmount(): Promise<number> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return 0;

  // Get all unique transactions that have at least one tag
  const { data: transactionTags, error } = await supabase
    .from('transaction_tags')
    .select('transaction_id, transactions!inner(id, total_amount, transaction_type, budget_account_id)')
    .eq('transactions.budget_account_id', accountId);

  if (error) throw error;

  // Get unique transaction IDs and their amounts
  const transactionMap = new Map<number, { total_amount: number; transaction_type: string }>();
  
  (transactionTags || []).forEach(tt => {
    const transaction = tt.transactions as any;
    if (transaction && transaction.id) {
      transactionMap.set(transaction.id, {
        total_amount: transaction.total_amount,
        transaction_type: transaction.transaction_type || 'expense',
      });
    }
  });

  // Calculate net total (income reduces, expense increases)
  let netTotal = 0;
  transactionMap.forEach(t => {
    const multiplier = t.transaction_type === 'income' ? -1 : 1;
    netTotal += Number(t.total_amount) * multiplier;
  });

  return netTotal;
}

/**
 * Get tag by ID
 */
export async function getTagById(id: number): Promise<Tag | null> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return null;

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Create a new tag
 */
export async function createTag(data: { name: string; color?: string; description?: string }): Promise<Tag> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Automatically lowercase tag names to prevent duplicates
  const lowercasedName = data.name.trim().toLowerCase();

  const { data: tag, error } = await supabase
    .from('tags')
    .insert({
      user_id: user.id,
      account_id: accountId,
      name: lowercasedName,
      color: data.color || null,
      description: data.description?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return tag;
}

/**
 * Update a tag
 */
export async function updateTag(
  id: number,
  data: Partial<Pick<Tag, 'name' | 'color' | 'description'>>
): Promise<Tag> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const updateData: any = {};
  // Automatically lowercase tag names to prevent duplicates
  if (data.name !== undefined) updateData.name = data.name.trim().toLowerCase();
  if (data.color !== undefined) updateData.color = data.color || null;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  updateData.updated_at = new Date().toISOString();

  const { data: tag, error } = await supabase
    .from('tags')
    .update(updateData)
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) throw error;
  return tag;
}

/**
 * Delete a tag
 */
export async function deleteTag(
  id: number,
  force: boolean = false
): Promise<{ success: boolean; deleted_transactions_count?: number }> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get count of affected transactions
  const { count } = await supabase
    .from('transaction_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', id);

  if (!force && count && count > 0) {
    throw new Error(`Tag is used by ${count} transactions. Use force=true to delete anyway.`);
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) throw error;
  return { success: true, deleted_transactions_count: count || 0 };
}

/**
 * Merge multiple tags into one
 */
export async function mergeTags(
  sourceTagIds: number[],
  targetTagId: number
): Promise<{ success: boolean; merged_count: number }> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Verify all tags belong to active account
  const { data: tags } = await supabase
    .from('tags')
    .select('id')
    .in('id', [...sourceTagIds, targetTagId])
    .eq('account_id', accountId);

  if (!tags || tags.length !== sourceTagIds.length + 1) {
    throw new Error('One or more tags do not belong to the active account');
  }

  // Move all transaction_tags from source tags to target tag
  // First, get existing transaction_tags for target tag to avoid duplicates
  const { data: existingTargetTags } = await supabase
    .from('transaction_tags')
    .select('transaction_id')
    .eq('tag_id', targetTagId);

  const existingTransactionIds = new Set((existingTargetTags || []).map(tt => tt.transaction_id));

  // Get transaction_tags from source tags
  const { data: sourceTags } = await supabase
    .from('transaction_tags')
    .select('transaction_id, tag_id')
    .in('tag_id', sourceTagIds);

  // Filter out duplicates and insert
  const tagsToInsert = (sourceTags || [])
    .filter(tt => !existingTransactionIds.has(tt.transaction_id))
    .map(tt => ({
      transaction_id: tt.transaction_id,
      tag_id: targetTagId,
    }));

  let mergedCount = 0;
  if (tagsToInsert.length > 0) {
    const { data, error: insertError } = await supabase
      .from('transaction_tags')
      .upsert(tagsToInsert, { onConflict: 'transaction_id,tag_id', ignoreDuplicates: true })
      .select();

    if (insertError) throw insertError;
    mergedCount = data?.length || 0;
  }

  // Delete source tags (cascade will delete their transaction_tags)
  await supabase
    .from('tags')
    .delete()
    .in('id', sourceTagIds)
    .eq('account_id', accountId);

  return { success: true, merged_count: mergedCount };
}

/**
 * Get tags for a transaction
 */
export async function getTransactionTags(transactionId: number): Promise<Tag[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from('transaction_tags')
    .select('tags(*)')
    .eq('transaction_id', transactionId)
    .eq('tags.account_id', accountId);

  if (error) throw error;
  return (data || []).map((tt: any) => tt.tags).filter(Boolean);
}

/**
 * Add tags to a transaction
 */
export async function addTagsToTransaction(transactionId: number, tagIds: number[]): Promise<Tag[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  if (tagIds.length === 0) return [];

  // Verify tags belong to active account
  const { data: tags } = await supabase
    .from('tags')
    .select('id')
    .in('id', tagIds)
    .eq('account_id', accountId);

  if (!tags || tags.length !== tagIds.length) {
    throw new Error('One or more tags do not belong to the active account');
  }

  // Verify transaction belongs to active account
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('budget_account_id', accountId)
    .single();

  if (!transaction) {
    throw new Error('Transaction does not belong to the active account');
  }

  // Insert transaction_tags (ignore conflicts using upsert)
  const { error: insertError } = await supabase
    .from('transaction_tags')
    .upsert(
      tagIds.map(tagId => ({ transaction_id: transactionId, tag_id: tagId })),
      { onConflict: 'transaction_id,tag_id', ignoreDuplicates: true }
    );

  if (insertError) throw insertError;

  return getTransactionTags(transactionId);
}

/**
 * Remove tag from transaction
 * RLS policies ensure transaction and tag belong to user's account
 */
export async function removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId)
    .eq('tag_id', tagId);

  if (error) throw error;
  return true;
}

/**
 * Replace all tags on a transaction
 */
export async function setTransactionTags(transactionId: number, tagIds: number[]): Promise<Tag[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Verify tags belong to active account (RLS handles transaction validation)
  if (tagIds.length > 0) {
    const { data: tags } = await supabase
      .from('tags')
      .select('id')
      .in('id', tagIds)
      .eq('account_id', accountId);

    if (!tags || tags.length !== tagIds.length) {
      throw new Error('One or more tags do not belong to the active account');
    }
  }

  // Delete existing tags (RLS ensures transaction belongs to user's account)
  await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId);

  // Insert new tags (use upsert to handle duplicates, RLS ensures transaction/tag belong to user's account)
  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from('transaction_tags')
      .upsert(
        tagIds.map(tagId => ({ transaction_id: transactionId, tag_id: tagId })),
        { onConflict: 'transaction_id,tag_id', ignoreDuplicates: true }
      );

    if (insertError) throw insertError;
  }

  return getTransactionTags(transactionId);
}

/**
 * Bulk assign tags to multiple transactions
 */
export async function bulkAssignTags(transactionIds: number[], tagIds: number[]): Promise<number> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  if (tagIds.length === 0 || transactionIds.length === 0) return 0;

  // Verify tags belong to active account
  const { data: tags } = await supabase
    .from('tags')
    .select('id')
    .in('id', tagIds)
    .eq('account_id', accountId);

  if (!tags || tags.length !== tagIds.length) {
    throw new Error('One or more tags do not belong to the active account');
  }

  // Insert all combinations (ignore conflicts)
  const inserts = transactionIds.flatMap(txId =>
    tagIds.map(tagId => ({ transaction_id: txId, tag_id: tagId }))
  );

  // Use upsert with ignoreDuplicates to handle cases where tags already exist
  const { data, error } = await supabase
    .from('transaction_tags')
    .upsert(inserts, { 
      onConflict: 'transaction_id,tag_id',
      ignoreDuplicates: true 
    })
    .select();

  if (error) {
    throw error;
  }

  // Return the number of tag-transaction relationships that were successfully created
  // This represents the number of tags assigned (not transactions)
  return data?.length || 0;
}

/**
 * Bulk remove tags from multiple transactions
 */
export async function bulkRemoveTags(transactionIds: number[], tagIds: number[]): Promise<number> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Verify transactions belong to active account
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id')
    .in('id', transactionIds)
    .eq('budget_account_id', accountId);

  if (!transactions || transactions.length !== transactionIds.length) {
    throw new Error('One or more transactions do not belong to the active account');
  }

  // Verify tags belong to active account
  if (tagIds.length > 0) {
    const { data: tags } = await supabase
      .from('tags')
      .select('id')
      .in('id', tagIds)
      .eq('account_id', accountId);

    if (!tags || tags.length !== tagIds.length) {
      throw new Error('One or more tags do not belong to the active account');
    }
  }

  const { count } = await supabase
    .from('transaction_tags')
    .delete()
    .in('transaction_id', transactionIds)
    .in('tag_id', tagIds)
    .select();

  return count || 0;
}

/**
 * Search tags by name
 */
export async function searchTags(query: string): Promise<Tag[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('account_id', accountId)
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(20);

  if (error) throw error;
  return data || [];
}
