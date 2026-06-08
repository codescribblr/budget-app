import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError, getExternalDb, listByAccountId } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('accounts', async (_request, context) => {
  const data = await listByAccountId('accounts', 'account_id', context.budgetAccountId, {
    orderBy: 'name',
  });
  return NextResponse.json(externalApiData(data, context));
});

export const POST = withExternalApi('accounts', async (request, context) => {
  const body = await request.json();
  if (!body.name?.trim()) {
    throw new ExternalApiValidationError('name is required');
  }

  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      account_id: context.budgetAccountId,
      user_id: context.createdBy,
      name: body.name.trim(),
      account_type: body.account_type ?? 'checking',
      balance: body.balance ?? 0,
      include_in_totals: body.include_in_totals ?? true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return NextResponse.json(externalApiData(data, context), { status: 201 });
});
