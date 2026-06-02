import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('income_buffer', async (_request, context) => {
  const supabase = getExternalDb();
  const accountId = context.budgetAccountId;

  const { data: featureFlag } = await supabase
    .from('user_feature_flags')
    .select('enabled')
    .eq('account_id', accountId)
    .eq('feature_name', 'income_buffer')
    .maybeSingle();

  if (!featureFlag?.enabled) {
    return NextResponse.json(
      externalApiData(
        { enabled: false, balance: 0, monthsOfRunway: 0, monthlyBudget: 0 },
        context
      )
    );
  }

  const { data: bufferCategory } = await supabase
    .from('categories')
    .select('id, current_balance')
    .eq('account_id', accountId)
    .eq('name', 'Income Buffer')
    .eq('is_system', true)
    .maybeSingle();

  const { data: categories } = await supabase
    .from('categories')
    .select('monthly_amount')
    .eq('account_id', accountId)
    .eq('is_system', false);

  const monthlyBudget = categories?.reduce((sum, cat) => sum + (Number(cat.monthly_amount) || 0), 0) || 0;
  const balance = bufferCategory?.current_balance ?? 0;
  const monthsOfRunway = monthlyBudget > 0 ? balance / monthlyBudget : 0;

  return NextResponse.json(
    externalApiData(
      {
        enabled: true,
        balance,
        monthsOfRunway: Math.round(monthsOfRunway * 10) / 10,
        monthlyBudget,
      },
      context
    )
  );
});
