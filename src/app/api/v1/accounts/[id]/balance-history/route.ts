import { NextResponse } from 'next/server';
import { externalApiData } from '@/lib/external-api/handler';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = externalApiIdRoute('accounts', async (_request, context, id) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('account_balance_audit')
    .select('*')
    .eq('account_id', id)
    .eq('budget_account_id', context.budgetAccountId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return NextResponse.json(externalApiData(data ?? [], context));
});
