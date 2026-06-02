import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb, listByAccountId } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('recurring_transactions', async (request, context) => {
  const supabase = getExternalDb();
  const isActive = request.nextUrl.searchParams.get('isActive');
  const isConfirmed = request.nextUrl.searchParams.get('isConfirmed');

  let query = supabase
    .from('recurring_transactions')
    .select('*')
    .eq('budget_account_id', context.budgetAccountId)
    .order('next_expected_date', { ascending: true });

  if (isActive !== null) query = query.eq('is_active', isActive === 'true');
  if (isConfirmed !== null) query = query.eq('is_confirmed', isConfirmed === 'true');

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json(externalApiData(data ?? [], context));
});

export const POST = withExternalApi('recurring_transactions', async (request, context) => {
  const body = await request.json();
  const supabase = getExternalDb();

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      ...body,
      user_id: context.createdBy,
      budget_account_id: context.budgetAccountId,
      expected_amount: body.expectedAmount ? Math.abs(body.expectedAmount) : body.expected_amount ?? null,
      detection_method: body.detection_method ?? body.detectionMethod ?? 'manual',
    })
    .select('*')
    .single();

  if (error) throw error;
  return NextResponse.json(externalApiData(data, context), { status: 201 });
});
