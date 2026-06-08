import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb, parsePagination } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('imports', async (request, context) => {
  const supabase = getExternalDb();
  const { from, to } = parsePagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get('status');

  let query = supabase
    .from('queued_imports')
    .select('*', { count: 'exact' })
    .eq('account_id', context.budgetAccountId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);

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
