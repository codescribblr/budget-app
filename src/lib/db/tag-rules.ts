import { createClient } from '@/lib/supabase/server';
import type { TagRule } from '@/lib/types';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * Get all tag rules for the current account
 */
export async function getTagRules(): Promise<TagRule[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from('tag_rules')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get tag rule by ID
 */
export async function getTagRuleById(id: number): Promise<TagRule | null> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return null;

  const { data, error } = await supabase
    .from('tag_rules')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Create a new tag rule
 */
export async function createTagRule(data: {
  tag_id: number;
  rule_type: 'category' | 'merchant' | 'description' | 'amount';
  rule_value: string;
  priority?: number;
  is_active?: boolean;
}): Promise<TagRule> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Verify tag belongs to account
  const { data: tag } = await supabase
    .from('tags')
    .select('id')
    .eq('id', data.tag_id)
    .eq('account_id', accountId)
    .single();

  if (!tag) {
    throw new Error('Tag does not belong to the active account');
  }

  const { data: rule, error } = await supabase
    .from('tag_rules')
    .insert({
      user_id: user.id,
      account_id: accountId,
      tag_id: data.tag_id,
      rule_type: data.rule_type,
      rule_value: data.rule_value.trim(),
      priority: data.priority || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return rule;
}

/**
 * Update a tag rule
 */
export async function updateTagRule(
  id: number,
  data: Partial<Pick<TagRule, 'tag_id' | 'rule_type' | 'rule_value' | 'priority' | 'is_active'>>
): Promise<TagRule> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const updateData: any = {};
  if (data.tag_id !== undefined) updateData.tag_id = data.tag_id;
  if (data.rule_type !== undefined) updateData.rule_type = data.rule_type;
  if (data.rule_value !== undefined) updateData.rule_value = data.rule_value.trim();
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  updateData.updated_at = new Date().toISOString();

  const { data: rule, error } = await supabase
    .from('tag_rules')
    .update(updateData)
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) throw error;
  return rule;
}

/**
 * Delete a tag rule
 */
export async function deleteTagRule(id: number): Promise<boolean> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { error } = await supabase
    .from('tag_rules')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) throw error;
  return true;
}

/**
 * Apply tag rules to a transaction
 * Returns array of tag IDs that should be assigned
 */
export async function applyTagRulesToTransaction(transactionId: number): Promise<number[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  // Get transaction with related data
  const { data: transaction } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_splits (
        category_id,
        categories (name)
      ),
      merchant_groups (display_name)
    `)
    .eq('id', transactionId)
    .eq('budget_account_id', accountId)
    .single();

  if (!transaction) return [];

  // Get all active tag rules for this account
  const { data: rules } = await supabase
    .from('tag_rules')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!rules || rules.length === 0) return [];

  const matchingTagIds = new Set<number>();

  for (const rule of rules) {
    let matches = false;

    switch (rule.rule_type) {
      case 'category':
        const categoryIds = (transaction.transaction_splits || []).map((s: any) => s.category_id);
        const categoryNames = (transaction.transaction_splits || []).map((s: any) => s.categories?.name?.toLowerCase() || '');
        const ruleValueLower = rule.rule_value.toLowerCase();
        matches = categoryIds.includes(parseInt(rule.rule_value)) || 
                  categoryNames.some((name: string) => name.includes(ruleValueLower));
        break;

      case 'merchant':
        const merchantName = (transaction.merchant_groups as any)?.display_name?.toLowerCase() || '';
        matches = merchantName.includes(rule.rule_value.toLowerCase());
        break;

      case 'description':
        matches = transaction.description.toLowerCase().includes(rule.rule_value.toLowerCase());
        break;

      case 'amount':
        const amount = parseFloat(rule.rule_value);
        if (!isNaN(amount)) {
          matches = Math.abs(transaction.total_amount - amount) < 0.01;
        }
        break;
    }

    if (matches) {
      matchingTagIds.add(rule.tag_id);
    }
  }

  return Array.from(matchingTagIds);
}

