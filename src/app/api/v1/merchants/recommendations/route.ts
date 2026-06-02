import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('merchants', async (_request, context) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('merchant_recommendations')
    .select('*')
    .eq('account_id', context.budgetAccountId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return NextResponse.json(externalApiData(data ?? [], context));
});
