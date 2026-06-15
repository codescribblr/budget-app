import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBudgetAccountPublicId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function resolveBudgetAccountIdByPublicId(
  supabase: SupabaseClient,
  publicId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('budget_accounts')
    .select('id')
    .eq('public_id', publicId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function resolveBudgetAccountReference(
  supabase: SupabaseClient,
  reference: string
): Promise<number | null> {
  if (isBudgetAccountPublicId(reference)) {
    return resolveBudgetAccountIdByPublicId(supabase, reference);
  }

  const numericId = parseInt(reference, 10);
  if (!Number.isNaN(numericId) && numericId.toString() === reference.trim()) {
    const { data, error } = await supabase
      .from('budget_accounts')
      .select('id')
      .eq('id', numericId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  }

  return null;
}
