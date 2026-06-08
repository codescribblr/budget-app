import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError, getExternalDb, listByAccountId } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('credit_cards', async (_request, context) => {
  const data = await listByAccountId('credit_cards', 'account_id', context.budgetAccountId, {
    orderBy: 'name',
  });
  return NextResponse.json(externalApiData(data, context));
});

export const POST = withExternalApi('credit_cards', async (request, context) => {
  const body = await request.json();
  if (!body.name?.trim()) {
    throw new ExternalApiValidationError('name is required');
  }

  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      account_id: context.budgetAccountId,
      user_id: context.createdBy,
      name: body.name.trim(),
      current_balance: body.current_balance ?? 0,
      credit_limit: body.credit_limit ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return NextResponse.json(externalApiData(data, context), { status: 201 });
});
