import { createServiceRoleClient } from '@/lib/supabase/server';

export type CleanupEmptyMerchantGroupsResult = {
  scanned: number;
  deleted: number;
  skipped_linked_global: number;
  skipped_referenced: number;
  deleted_ids: number[];
};

/**
 * Delete empty per-user merchant groups that are safe to remove:
 * - no transactions, mappings, category rules, or recurring refs
 * - not linked to a global merchant the user customized
 *   (any group with global_merchant_id set is kept, unless display_name
 *    still matches the global name AND we only delete unlinked orphans —
 *    we never delete groups that still have global_merchant_id)
 */
export async function cleanupEmptyMerchantGroups(options?: {
  limit?: number;
}): Promise<CleanupEmptyMerchantGroupsResult> {
  const supabase = createServiceRoleClient();
  const limit = Math.min(Math.max(options?.limit ?? 5000, 1), 20000);

  const { data: candidates, error } = await supabase
    .from('merchant_groups')
    .select('id, display_name, global_merchant_id')
    .is('global_merchant_id', null)
    .order('id', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const result: CleanupEmptyMerchantGroupsResult = {
    scanned: candidates?.length ?? 0,
    deleted: 0,
    skipped_linked_global: 0,
    skipped_referenced: 0,
    deleted_ids: [],
  };

  for (const group of candidates ?? []) {
    if (group.global_merchant_id != null) {
      result.skipped_linked_global++;
      continue;
    }

    const id = group.id as number;

    const [
      { count: txCount, error: txErr },
      { count: mapCount, error: mapErr },
      { count: ruleCount, error: ruleErr },
      { count: recurringCount, error: recurringErr },
      { count: feedbackCount, error: feedbackErr },
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_group_id', id),
      supabase
        .from('merchant_mappings')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_group_id', id),
      supabase
        .from('merchant_category_rules')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_group_id', id),
      supabase
        .from('recurring_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_group_id', id),
      supabase
        .from('recurring_user_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_group_id', id),
    ]);

    if (txErr || mapErr || ruleErr || recurringErr || feedbackErr) {
      console.error('Error checking merchant group references:', {
        id,
        txErr,
        mapErr,
        ruleErr,
        recurringErr,
        feedbackErr,
      });
      result.skipped_referenced++;
      continue;
    }

    const referenced =
      (txCount ?? 0) > 0 ||
      (mapCount ?? 0) > 0 ||
      (ruleCount ?? 0) > 0 ||
      (recurringCount ?? 0) > 0 ||
      (feedbackCount ?? 0) > 0;

    if (referenced) {
      result.skipped_referenced++;
      continue;
    }

    // Extra safety: skip if any transaction that somehow still points here has an override
    // (should already be covered by txCount, but keep the intent explicit).
    const { count: overrideCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_group_id', id)
      .not('merchant_override_id', 'is', null);
    if ((overrideCount ?? 0) > 0) {
      result.skipped_referenced++;
      continue;
    }

    const { error: deleteError } = await supabase
      .from('merchant_groups')
      .delete()
      .eq('id', id)
      .is('global_merchant_id', null);

    if (deleteError) {
      console.error(`Error deleting empty merchant group ${id}:`, deleteError);
      result.skipped_referenced++;
      continue;
    }

    result.deleted++;
    result.deleted_ids.push(id);
  }

  return result;
}
