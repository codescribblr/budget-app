import type { SupabaseClient } from '@supabase/supabase-js';
import { userHasAccountAccess } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getRentCastIntegrationRow, toPublicRentCastIntegration } from './sync';

export async function getRentCastIntegrationForAccountMember(accountId: number) {
  const hasAccess = await userHasAccountAccess(accountId);
  if (!hasAccess) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const row = await getRentCastIntegrationRow(supabase, accountId);
  return toPublicRentCastIntegration(row);
}

export async function getRentCastIntegrationRowForAccountMember(
  accountId: number
): Promise<Awaited<ReturnType<typeof getRentCastIntegrationRow>>> {
  const hasAccess = await userHasAccountAccess(accountId);
  if (!hasAccess) {
    return null;
  }

  const supabase = createServiceRoleClient();
  return getRentCastIntegrationRow(supabase, accountId);
}

export async function getRentCastIntegrationSupabaseForSync(
  accountId: number
): Promise<SupabaseClient | null> {
  const hasAccess = await userHasAccountAccess(accountId);
  if (!hasAccess) {
    return null;
  }

  return createServiceRoleClient();
}
