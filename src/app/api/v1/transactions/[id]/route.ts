import { NextResponse } from 'next/server';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { externalApiData } from '@/lib/external-api/handler';
import { ExternalApiNotFoundError, getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = externalApiIdRoute('transactions', async (_request, context, id) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_splits(*)')
    .eq('id', id)
    .eq('budget_account_id', context.budgetAccountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ExternalApiNotFoundError('Transaction not found');
  return NextResponse.json(externalApiData(data, context));
});

export const PATCH = externalApiIdRoute('transactions', async (request, context, id) => {
  const supabase = getExternalDb();
  const body = await request.json();
  const {
    id: _id,
    budget_account_id,
    user_id,
    created_at,
    transaction_splits,
    ...updates
  } = body;

  const { data, error } = await supabase
    .from('transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('budget_account_id', context.budgetAccountId)
    .select('*, transaction_splits(*)')
    .single();

  if (error) throw error;
  return NextResponse.json(externalApiData(data, context));
});

export const DELETE = externalApiIdRoute('transactions', async (_request, context, id) => {
  const supabase = getExternalDb();
  await supabase.from('transaction_splits').delete().eq('transaction_id', id);
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('budget_account_id', context.budgetAccountId);

  if (error) throw error;
  return NextResponse.json(externalApiData({ success: true }, context));
});
