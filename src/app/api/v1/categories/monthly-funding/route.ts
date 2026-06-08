import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApiService('reports', async (request, context) => {
  const month = request.nextUrl.searchParams.get('month');
  const supabase = getExternalDb();

  let query = supabase
    .from('category_monthly_funding')
    .select('*, categories(name)')
    .eq('account_id', context.budgetAccountId);

  if (month) {
    query = query.eq('month', month.endsWith('-01') ? month : `${month}-01`);
  }

  const { data, error } = await query.order('month', { ascending: false });
  if (error) throw error;

  return NextResponse.json(externalApiData(data ?? [], context));
});
