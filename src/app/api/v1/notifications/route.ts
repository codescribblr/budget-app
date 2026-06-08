import { NextRequest, NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb, parsePagination } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('notifications', async (request, context) => {
  const supabase = getExternalDb();
  const { from, to } = parsePagination(request.nextUrl.searchParams);
  const type = request.nextUrl.searchParams.get('type');
  const isRead = request.nextUrl.searchParams.get('isRead');

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('budget_account_id', context.budgetAccountId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (type) query = query.eq('notification_type_id', type);
  if (isRead !== null) query = query.eq('is_read', isRead === 'true');

  const { data, error, count } = await query;
  if (error) throw error;

  return NextResponse.json({
    ...externalApiData(data ?? [], context),
    meta: {
      account_id: context.budgetAccountId,
      api_key_id: context.apiKeyId,
      total: count ?? 0,
    },
  });
});
