import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError, getExternalDb } from '@/lib/external-api/query-helpers';
import { logBalanceChange } from '@/lib/audit/category-balance-audit';

async function getIncomeBufferCategory(accountId: number) {
  const supabase = getExternalDb();
  const { data: featureFlag } = await supabase
    .from('user_feature_flags')
    .select('enabled')
    .eq('account_id', accountId)
    .eq('feature_name', 'income_buffer')
    .maybeSingle();

  if (!featureFlag?.enabled) {
    throw new ExternalApiValidationError('Income Buffer feature is not enabled');
  }

  const { data: bufferCategory, error } = await supabase
    .from('categories')
    .select('id, current_balance')
    .eq('account_id', accountId)
    .eq('name', 'Income Buffer')
    .eq('is_system', true)
    .maybeSingle();

  if (error || !bufferCategory) {
    throw new ExternalApiValidationError('Income Buffer category not found');
  }

  return bufferCategory;
}

export const POST = withExternalApiService('income_buffer', async (request, context) => {
  const body = await request.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    throw new ExternalApiValidationError('Amount must be greater than 0');
  }

  const bufferCategory = await getIncomeBufferCategory(context.budgetAccountId);
  const supabase = getExternalDb();
  const oldBalance = bufferCategory.current_balance;
  const newBalance = oldBalance + amount;

  const { error } = await supabase
    .from('categories')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', bufferCategory.id);

  if (error) throw error;

  await logBalanceChange(bufferCategory.id, oldBalance, newBalance, 'income_buffer_fund', {});

  return NextResponse.json(
    externalApiData({ success: true, newBalance, amountAdded: amount }, context)
  );
});
