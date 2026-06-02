import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('notifications', async (_request, context) => {
  const supabase = getExternalDb();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('budget_account_id', context.budgetAccountId)
    .eq('user_id', context.createdBy)
    .eq('is_read', false);

  if (error) throw error;
  return NextResponse.json(externalApiData({ unreadCount: count ?? 0 }, context));
});
