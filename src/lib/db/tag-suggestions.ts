import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';
import type { Tag } from '@/lib/types';

/**
 * Get tag suggestions for a transaction based on:
 * 1. Existing tags on similar transactions (same merchant/category)
 * 2. Tag rules that match
 * 3. Most frequently used tags
 */
export async function getTagSuggestions(
  transactionDescription: string,
  categoryIds: number[],
  merchantGroupId?: number | null
): Promise<Tag[]> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  if (!accountId) return [];

  const suggestions = new Map<number, { tag: Tag; score: number }>();

  // 1. Get tags from similar transactions (same merchant or category)
  if (merchantGroupId || categoryIds.length > 0) {
    let query = supabase
      .from('transaction_tags')
      .select('tags(*), transactions!inner(budget_account_id, merchant_group_id)')
      .eq('transactions.budget_account_id', accountId);

    if (merchantGroupId) {
      query = query.eq('transactions.merchant_group_id', merchantGroupId);
    }

    const { data: similarTags } = await query;

    if (similarTags) {
      similarTags.forEach((tt: any) => {
        if (tt.tags) {
          const tag = tt.tags as Tag;
          const current = suggestions.get(tag.id);
          suggestions.set(tag.id, {
            tag,
            score: (current?.score || 0) + 2, // Higher weight for merchant matches
          });
        }
      });
    }

    // Also check category matches
    if (categoryIds.length > 0) {
      const { data: categoryTags } = await supabase
        .from('transaction_tags')
        .select('tags(*), transactions!inner(budget_account_id, transaction_splits!inner(category_id))')
        .eq('transactions.budget_account_id', accountId)
        .in('transactions.transaction_splits.category_id', categoryIds);

      if (categoryTags) {
        categoryTags.forEach((tt: any) => {
          if (tt.tags) {
            const tag = tt.tags as Tag;
            const current = suggestions.get(tag.id);
            suggestions.set(tag.id, {
              tag,
              score: (current?.score || 0) + 1, // Lower weight for category matches
            });
          }
        });
      }
    }
  }

  // 2. Check tag rules
  const { data: rules } = await supabase
    .from('tag_rules')
    .select('tag_id, tags(*)')
    .eq('account_id', accountId)
    .eq('is_active', true);

  if (rules) {
    const descriptionLower = transactionDescription.toLowerCase();
    rules.forEach((rule: any) => {
      if (rule.tags) {
        const tag = rule.tags as Tag;
        let matches = false;

        switch (rule.rule_type) {
          case 'description':
            matches = descriptionLower.includes(rule.rule_value.toLowerCase());
            break;
          case 'category':
            matches = categoryIds.includes(parseInt(rule.rule_value));
            break;
        }

        if (matches) {
          const current = suggestions.get(tag.id);
          suggestions.set(tag.id, {
            tag,
            score: (current?.score || 0) + 3, // Highest weight for rule matches
          });
        }
      }
    });
  }

  // 3. Get most frequently used tags (fallback)
  const { data: frequentTags } = await supabase
    .from('transaction_tags')
    .select('tag_id, tags(*)')
    .eq('tags.account_id', accountId)
    .limit(5);

  if (frequentTags) {
    frequentTags.forEach((tt: any) => {
      if (tt.tags && !suggestions.has(tt.tags.id)) {
        suggestions.set(tt.tags.id, {
          tag: tt.tags as Tag,
          score: 0.5, // Low weight for frequency-only
        });
      }
    });
  }

  // Sort by score and return top 5
  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.tag);
}

