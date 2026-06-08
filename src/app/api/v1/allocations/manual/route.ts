import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { recordMonthlyFunding, isFeatureEnabled } from '@/lib/supabase-queries';
import { ExternalApiNotFoundError, ExternalApiValidationError, getExternalDb } from '@/lib/external-api/query-helpers';
import { logBalanceChange } from '@/lib/audit/category-balance-audit';

export const POST = withExternalApiService('categories', async (request, context) => {
  const body = await request.json();
  const categoryId = Number(body.categoryId);
  const amount = Number(body.amount);
  const allocationMonth = body.month || `${new Date().toISOString().slice(0, 7)}-01`;

  if (!categoryId || Number.isNaN(categoryId)) {
    throw new ExternalApiValidationError('categoryId is required');
  }
  if (!amount || amount <= 0) {
    throw new ExternalApiValidationError('amount must be a positive number');
  }

  const supabase = getExternalDb();
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, current_balance, monthly_amount')
    .eq('id', categoryId)
    .eq('account_id', context.budgetAccountId)
    .maybeSingle();

  if (categoryError || !category) {
    throw new ExternalApiNotFoundError('Category not found');
  }

  const oldBalance = category.current_balance || 0;
  const newBalance = oldBalance + amount;

  const { error: updateError } = await supabase
    .from('categories')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .eq('account_id', context.budgetAccountId);

  if (updateError) throw updateError;

  await logBalanceChange(categoryId, oldBalance, newBalance, 'allocation_manual', {
    allocation_month: allocationMonth,
  });

  let fundingTracked = false;
  if (await isFeatureEnabled('monthly_funding_tracking')) {
    await recordMonthlyFunding(categoryId, allocationMonth, amount, category.monthly_amount);
    fundingTracked = true;
  }

  const { data: updatedCategory } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  return NextResponse.json(
    externalApiData(
      {
        success: true,
        category: updatedCategory,
        allocation: { amount, month: allocationMonth, fundingTracked },
      },
      context
    )
  );
});
