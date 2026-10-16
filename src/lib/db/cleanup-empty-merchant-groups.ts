import { createServiceRoleClient } from '@/lib/supabase/server';

export type CleanupEmptyMerchantGroupsResult = {
  deleted: number;
  user_id: string | null;
};

/**
 * Delete empty unlinked per-user merchant groups via set-based SQL RPC.
 * Safe: never deletes groups with a global_merchant_id, or any referenced by
 * transactions / merchant_mappings / category rules / recurring rows.
 */
export async function cleanupEmptyMerchantGroups(options?: {
  userId?: string | null;
}): Promise<CleanupEmptyMerchantGroupsResult> {
  const supabase = createServiceRoleClient();
  const userId = options?.userId?.trim() || null;

  const { data, error } = await supabase.rpc('cleanup_empty_merchant_groups', {
    p_user_id: userId,
  });

  if (error) throw error;

  const deleted = typeof data === 'number' ? data : Number(data) || 0;
  return { deleted, user_id: userId };
}
