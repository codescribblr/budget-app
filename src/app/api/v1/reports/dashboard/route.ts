import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('reports', async (_request, context) => {
  const supabase = getExternalDb();
  const accountId = context.budgetAccountId;

  const [
    { data: accounts },
    { data: creditCards },
    { data: categories },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('accounts').select('id, name, balance, include_in_totals').eq('account_id', accountId),
    supabase.from('credit_cards').select('id, name, current_balance, credit_limit').eq('account_id', accountId),
    supabase
      .from('categories')
      .select('id, name, current_balance, monthly_amount, is_archived')
      .eq('account_id', accountId)
      .or('is_archived.is.null,is_archived.eq.false'),
    supabase
      .from('transactions')
      .select('id, amount, date, transaction_type')
      .eq('budget_account_id', accountId)
      .order('date', { ascending: false })
      .limit(100),
  ]);

  const totalCash = (accounts ?? [])
    .filter((a) => a.include_in_totals !== false)
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const totalCreditCardDebt = (creditCards ?? []).reduce(
    (sum, c) => sum + (Number(c.current_balance) || 0),
    0
  );
  const totalCategoryBalance = (categories ?? []).reduce(
    (sum, c) => sum + (Number(c.current_balance) || 0),
    0
  );

  return NextResponse.json(
    externalApiData(
      {
        totalCash,
        totalCreditCardDebt,
        totalCategoryBalance,
        accountCount: accounts?.length ?? 0,
        creditCardCount: creditCards?.length ?? 0,
        categoryCount: categories?.length ?? 0,
        recentTransactionCount: transactions?.length ?? 0,
      },
      context
    )
  );
});
