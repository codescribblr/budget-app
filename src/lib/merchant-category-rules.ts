import { createClient } from './supabase/server';
import type { MerchantCategoryRule } from './types';

/**
 * Normalize merchant name for consistent matching
 */
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(inc|llc|ltd|corp|co|company)\b/g, '') // Remove company suffixes
    .replace(/\b(the)\b/g, '') // Remove "the"
    .trim();
}

/**
 * Get the merchant group ID for a given merchant description
 */
export async function getMerchantGroupId(merchant: string): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if this merchant has a mapping to a group
  const { data: mapping } = await supabase
    .from('merchant_mappings')
    .select('merchant_group_id')
    .eq('user_id', user.id)
    .eq('pattern', merchant)
    .maybeSingle();

  return mapping?.merchant_group_id || null;
}

/**
 * Find the best category for a merchant based on learned rules
 * This checks both merchant group rules and individual merchant rules
 */
export async function findBestCategoryForMerchant(
  merchant: string
): Promise<{ categoryId: number; confidence: number; source: 'group' | 'pattern' } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const normalized = normalizeMerchant(merchant);

  // First, try to find merchant group
  const merchantGroupId = await getMerchantGroupId(merchant);

  if (merchantGroupId) {
    // Get all category rules for this merchant group
    const { data: groupRules } = await supabase
      .from('merchant_category_rules')
      .select(`
        category_id,
        confidence_score,
        usage_count,
        categories!inner (id)
      `)
      .eq('user_id', user.id)
      .eq('merchant_group_id', merchantGroupId)
      .order('usage_count', { ascending: false })
      .order('confidence_score', { ascending: false });

    if (groupRules && groupRules.length > 0) {
      // Return the most used category for this merchant group
      const bestRule = groupRules[0];
      return {
        categoryId: bestRule.category_id,
        confidence: Math.min(bestRule.confidence_score / 100, 1.0),
        source: 'group',
      };
    }
  }

  // If no group rule found, try pattern-based rules
  const { data: patternRules } = await supabase
    .from('merchant_category_rules')
    .select(`
      category_id,
      confidence_score,
      usage_count,
      normalized_pattern,
      categories!inner (id)
    `)
    .eq('user_id', user.id)
    .not('pattern', 'is', null)
    .order('usage_count', { ascending: false })
    .order('confidence_score', { ascending: false });

  if (!patternRules || patternRules.length === 0) {
    return null;
  }

  // Find best matching pattern
  let bestMatch: { categoryId: number; confidence: number } | null = null;
  let bestSimilarity = 0;

  for (const rule of patternRules) {
    if (!rule.normalized_pattern) continue;

    // Simple similarity check
    const similarity = calculateSimilarity(normalized, rule.normalized_pattern);

    if (similarity >= 0.7) {
      const adjustedConfidence = similarity * Math.min(rule.confidence_score / 100, 1.0);

      if (adjustedConfidence > bestSimilarity) {
        bestSimilarity = adjustedConfidence;
        bestMatch = {
          categoryId: rule.category_id,
          confidence: adjustedConfidence,
        };
      }
    }
  }

  if (bestMatch) {
    return {
      ...bestMatch,
      source: 'pattern',
    };
  }

  return null;
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return (shorter / longer) * 0.95;
  }

  // Levenshtein distance (simplified)
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;

  let distance = 0;
  for (let i = 0; i < maxLength; i++) {
    if (s1[i] !== s2[i]) distance++;
  }

  return 1 - distance / maxLength;
}

/**
 * Learn from a categorized transaction
 * This updates or creates a category rule for the merchant/merchant group
 */
export async function learnFromTransaction(
  merchant: string,
  categoryId: number
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const normalized = normalizeMerchant(merchant);
  const now = new Date().toISOString();

  // Check if this merchant belongs to a group
  const merchantGroupId = await getMerchantGroupId(merchant);

  if (merchantGroupId) {
    // Update or create rule for the merchant group
    const { data: existing } = await supabase
      .from('merchant_category_rules')
      .select('id, confidence_score, usage_count')
      .eq('user_id', user.id)
      .eq('merchant_group_id', merchantGroupId)
      .eq('category_id', categoryId)
      .maybeSingle();

    if (existing) {
      // Increment usage count and confidence
      await supabase
        .from('merchant_category_rules')
        .update({
          usage_count: existing.usage_count + 1,
          confidence_score: Math.min(existing.confidence_score + 5, 100),
          last_used: now,
        })
        .eq('id', existing.id);
    } else {
      // Create new rule for this merchant group
      await supabase
        .from('merchant_category_rules')
        .insert({
          user_id: user.id,
          merchant_group_id: merchantGroupId,
          category_id: categoryId,
          confidence_score: 50, // Start with medium confidence for group rules
          usage_count: 1,
          last_used: now,
        });
    }
  } else {
    // No merchant group - create pattern-based rule
    const { data: existing } = await supabase
      .from('merchant_category_rules')
      .select('id, confidence_score, usage_count')
      .eq('user_id', user.id)
      .eq('pattern', merchant)
      .eq('category_id', categoryId)
      .maybeSingle();

    if (existing) {
      // Increment usage count and confidence
      await supabase
        .from('merchant_category_rules')
        .update({
          usage_count: existing.usage_count + 1,
          confidence_score: Math.min(existing.confidence_score + 5, 100),
          last_used: now,
        })
        .eq('id', existing.id);
    } else {
      // Create new pattern-based rule
      await supabase
        .from('merchant_category_rules')
        .insert({
          user_id: user.id,
          pattern: merchant,
          normalized_pattern: normalized,
          category_id: categoryId,
          confidence_score: 30, // Start with lower confidence for pattern rules
          usage_count: 1,
          last_used: now,
        });
    }
  }
}

/**
 * Bulk learn from imported transactions
 */
export async function learnFromImportedTransactions(
  transactions: Array<{ merchant: string; categoryId: number }>
): Promise<void> {
  for (const txn of transactions) {
    await learnFromTransaction(txn.merchant, txn.categoryId);
  }
}

/**
 * Get all category rules for a user
 */
export async function getAllCategoryRules(): Promise<MerchantCategoryRule[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('merchant_category_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('usage_count', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update the category of a rule
 */
export async function updateRuleCategory(id: number, newCategoryId: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // First, get the rule we're updating
  const { data: ruleToUpdate } = await supabase
    .from('merchant_category_rules')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!ruleToUpdate) {
    throw new Error('Rule not found');
  }

  // Check if there's already a rule for this merchant_group_id/pattern + new category combination
  let existingRuleQuery = supabase
    .from('merchant_category_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', newCategoryId)
    .neq('id', id); // Don't match the rule we're updating

  if (ruleToUpdate.merchant_group_id) {
    existingRuleQuery = existingRuleQuery.eq('merchant_group_id', ruleToUpdate.merchant_group_id);
  } else if (ruleToUpdate.pattern) {
    existingRuleQuery = existingRuleQuery.eq('pattern', ruleToUpdate.pattern);
  }

  const { data: existingRule } = await existingRuleQuery.maybeSingle();

  if (existingRule) {
    // There's already a rule for this merchant/group + category combination
    // Merge the usage counts and confidence, then delete the rule we're updating
    await supabase
      .from('merchant_category_rules')
      .update({
        usage_count: existingRule.usage_count + ruleToUpdate.usage_count,
        confidence_score: Math.min(
          Math.max(existingRule.confidence_score, ruleToUpdate.confidence_score) + 5,
          100
        ),
        last_used: new Date().toISOString(),
      })
      .eq('id', existingRule.id);

    // Delete the rule we were trying to update
    await supabase
      .from('merchant_category_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  } else {
    // No existing rule, just update the category
    await supabase
      .from('merchant_category_rules')
      .update({ category_id: newCategoryId })
      .eq('id', id)
      .eq('user_id', user.id);
  }
}

/**
 * Delete a category rule
 */
export async function deleteCategoryRule(id: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('merchant_category_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}

