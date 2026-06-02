import { NextRequest, NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import {
  ExternalApiValidationError,
  getByAccountId,
  getExternalDb,
  parsePagination,
} from '@/lib/external-api/query-helpers';
import { buildIlikePattern, sanitizeSearchQuery } from '@/lib/external-api/search-sanitize';

export const GET = withExternalApi('transactions', async (request, context) => {
  const supabase = getExternalDb();
  const { page, pageSize, from, to } = parsePagination(request.nextUrl.searchParams);
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate = request.nextUrl.searchParams.get('endDate');
  const searchQuery = request.nextUrl.searchParams.get('q');

  let query = supabase
    .from('transactions')
    .select('*, transaction_splits(*)', { count: 'exact' })
    .eq('budget_account_id', context.budgetAccountId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  if (searchQuery) {
    const sanitized = sanitizeSearchQuery(searchQuery);
    if (sanitized) {
      const pattern = buildIlikePattern(sanitized);
      query = query.or(`description.ilike."${pattern}",merchant.ilike."${pattern}"`);
    }
  }

  const { data, error, count } = await query
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return NextResponse.json({
    ...externalApiData(data ?? [], context),
    meta: {
      account_id: context.budgetAccountId,
      api_key_id: context.apiKeyId,
      page,
      pageSize,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    },
  });
});

export const POST = withExternalApi('transactions', async (request, context) => {
  const body = await request.json();
  if (!body.description || body.amount === undefined || !body.date) {
    throw new ExternalApiValidationError('description, amount, and date are required');
  }

  const supabase = getExternalDb();
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      budget_account_id: context.budgetAccountId,
      user_id: context.createdBy,
      description: body.description,
      amount: body.amount,
      date: body.date,
      account_id: body.account_id ?? null,
      credit_card_id: body.credit_card_id ?? null,
      category_id: body.category_id ?? null,
      merchant: body.merchant ?? null,
      transaction_type: body.transaction_type ?? 'expense',
      notes: body.notes ?? null,
    })
    .select('*')
    .single();

  if (txError) throw txError;

  if (Array.isArray(body.splits) && body.splits.length > 0) {
    const splits = body.splits.map((split: Record<string, unknown>) => ({
      transaction_id: transaction.id,
      category_id: split.category_id,
      amount: split.amount,
      user_id: context.createdBy,
    }));
    const { error: splitError } = await supabase.from('transaction_splits').insert(splits);
    if (splitError) throw splitError;
  }

  const { data: fullTransaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*, transaction_splits(*)')
    .eq('id', transaction.id)
    .single();

  if (fetchError) throw fetchError;
  return NextResponse.json(externalApiData(fullTransaction, context), { status: 201 });
});
