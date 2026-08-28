import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import {
  ExternalApiValidationError,
  getExternalDb,
  parsePagination,
} from '@/lib/external-api/query-helpers';
import { buildIlikePattern, sanitizeSearchQuery } from '@/lib/external-api/search-sanitize';
import {
  buildExternalTransactionCreate,
  categoryBalanceChange,
} from '@/lib/external-api/create-transaction';
import { logBalanceChange } from '@/lib/audit/category-balance-audit';

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
  const plan = buildExternalTransactionCreate(body, {
    budgetAccountId: context.budgetAccountId,
    createdBy: context.createdBy,
  });

  const supabase = getExternalDb();
  const categoryIds = [...new Set(plan.splits.map((split) => split.category_id))];
  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('id, current_balance, is_system')
    .eq('account_id', context.budgetAccountId)
    .in('id', categoryIds);

  if (categoryError) throw categoryError;
  if (!categories || categories.length !== categoryIds.length) {
    throw new ExternalApiValidationError('One or more categories do not belong to this account');
  }

  if (plan.transaction.account_id != null) {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', plan.transaction.account_id)
      .eq('account_id', context.budgetAccountId)
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) {
      throw new ExternalApiValidationError('account_id does not belong to this account');
    }
  }

  if (plan.transaction.credit_card_id != null) {
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('id')
      .eq('id', plan.transaction.credit_card_id)
      .eq('account_id', context.budgetAccountId)
      .maybeSingle();
    if (cardError) throw cardError;
    if (!card) {
      throw new ExternalApiValidationError('credit_card_id does not belong to this account');
    }
  }

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert(plan.transaction)
    .select('*')
    .single();

  if (txError) throw txError;

  const splits = plan.splits.map((split) => ({
    transaction_id: transaction.id,
    category_id: split.category_id,
    amount: split.amount,
  }));
  const { error: splitError } = await supabase.from('transaction_splits').insert(splits);
  if (splitError) throw splitError;

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  for (const split of plan.splits) {
    const category = categoryMap.get(split.category_id);
    if (!category || category.is_system) {
      continue;
    }
    const oldBalance = Number(category.current_balance) || 0;
    const newBalance = oldBalance + categoryBalanceChange(plan.transaction.transaction_type, split.amount);
    const { error: balanceError } = await supabase
      .from('categories')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', category.id)
      .eq('account_id', context.budgetAccountId);

    if (balanceError) throw balanceError;
    category.current_balance = newBalance;
    await logBalanceChange(category.id, oldBalance, newBalance, 'transaction_create', {
      transaction_id: transaction.id,
      transaction_description: plan.transaction.description,
    });
  }

  const { data: fullTransaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*, transaction_splits(*)')
    .eq('id', transaction.id)
    .single();

  if (fetchError) throw fetchError;
  return NextResponse.json(externalApiData(fullTransaction, context), { status: 201 });
});
