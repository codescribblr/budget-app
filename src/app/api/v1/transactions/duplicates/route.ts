import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApiService('transactions', async (_request, context) => {
  const supabase = getExternalDb();
  const accountId = context.budgetAccountId;

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id, date, description, total_amount, transaction_type,
      merchant_group_id, merchant_override_id, is_historical,
      account_id, credit_card_id, created_at,
      splits:transaction_splits(id, category_id, amount, category:categories(name))
    `)
    .eq('budget_account_id', accountId)
    .order('date', { ascending: false });

  if (error) throw error;

  const duplicateGroups: Array<{ amount: number; transactions: unknown[] }> = [];
  const processedIds = new Set<number>();
  const txns = transactions ?? [];

  for (let i = 0; i < txns.length; i++) {
    const txn1 = txns[i];
    if (processedIds.has(txn1.id)) continue;

    const duplicates = [txn1];
    const txn1Date = new Date(txn1.date);

    for (let j = i + 1; j < txns.length; j++) {
      const txn2 = txns[j];
      if (processedIds.has(txn2.id)) continue;

      const txn1Signed = txn1.transaction_type === 'income' ? -txn1.total_amount : txn1.total_amount;
      const txn2Signed = txn2.transaction_type === 'income' ? -txn2.total_amount : txn2.total_amount;

      if (Math.abs(txn1Signed - txn2Signed) < 0.01) {
        const daysDiff = Math.abs(
          (txn1Date.getTime() - new Date(txn2.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 1) {
          duplicates.push(txn2);
          processedIds.add(txn2.id);
        }
      }
    }

    if (duplicates.length > 1) {
      processedIds.add(txn1.id);
      duplicateGroups.push({
        amount: txn1.total_amount,
        transactions: duplicates,
      });
    }
  }

  const { data: reviewedGroups } = await supabase
    .from('duplicate_group_reviews')
    .select('transaction_ids')
    .eq('budget_account_id', accountId);

  const reviewedSets = new Set<string>();
  reviewedGroups?.forEach((review) => {
    reviewedSets.add([...review.transaction_ids].sort((a, b) => a - b).join(','));
  });

  const filtered = duplicateGroups.filter((group) => {
    const ids = (group.transactions as Array<{ id: number }>)
      .map((t) => t.id)
      .sort((a, b) => a - b)
      .join(',');
    return !reviewedSets.has(ids);
  });

  return NextResponse.json(externalApiData({ duplicateGroups: filtered }, context));
});
