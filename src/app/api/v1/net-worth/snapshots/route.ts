import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('reports', async (request, context) => {
  const supabase = getExternalDb();
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate = request.nextUrl.searchParams.get('endDate');

  let query = supabase
    .from('net_worth_snapshots')
    .select('*')
    .eq('budget_account_id', context.budgetAccountId)
    .order('snapshot_date', { ascending: true });

  if (startDate) query = query.gte('snapshot_date', startDate);
  if (endDate) query = query.lte('snapshot_date', endDate);

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json(externalApiData(data ?? [], context));
});
