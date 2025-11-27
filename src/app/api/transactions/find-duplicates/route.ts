import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Get all transactions with their splits and categories
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        total_amount,
        transaction_type,
        merchant_group_id,
        created_at,
        splits:transaction_splits(
          id,
          category_id,
          amount,
          category:categories(name)
        )
      `)
      .eq('budget_account_id', accountId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Find potential duplicates: same amount and date within ±1 day
    const duplicateGroups: any[] = [];
    const processedIds = new Set<number>();

    for (let i = 0; i < transactions.length; i++) {
      const txn1 = transactions[i];
      
      // Skip if already processed
      if (processedIds.has(txn1.id)) continue;

      const duplicates = [txn1];
      const txn1Date = new Date(txn1.date);

      // Look for transactions with same amount within ±1 day
      for (let j = i + 1; j < transactions.length; j++) {
        const txn2 = transactions[j];
        
        // Skip if already processed
        if (processedIds.has(txn2.id)) continue;

        const txn1SignedAmount = txn1.transaction_type === 'income' ? -txn1.total_amount : txn1.total_amount;
        const txn2SignedAmount = txn2.transaction_type === 'income' ? -txn2.total_amount : txn2.total_amount;

        // Check if signed amounts match (prevents income vs expense collisions)
        if (Math.abs(txn1SignedAmount - txn2SignedAmount) < 0.01) {
          const txn2Date = new Date(txn2.date);
          const daysDiff = Math.abs((txn1Date.getTime() - txn2Date.getTime()) / (1000 * 60 * 60 * 24));

          // Check if dates are within ±1 day
          if (daysDiff <= 1) {
            duplicates.push(txn2);
            processedIds.add(txn2.id);
          }
        }
      }

      // Only add to duplicate groups if we found more than one transaction
      if (duplicates.length > 1) {
        processedIds.add(txn1.id);
        duplicateGroups.push({
          amount: txn1.total_amount,
          transactions: duplicates.map(txn => ({
            id: txn.id,
            date: txn.date,
            description: txn.description,
            total_amount: txn.total_amount,
            transaction_type: txn.transaction_type,
            merchant_group_id: txn.merchant_group_id,
            created_at: txn.created_at,
            splits: txn.splits.map((split: any) => ({
              id: split.id,
              category_id: split.category_id,
              amount: split.amount,
              category_name: split.category?.name || 'Unknown',
            })),
          })),
        });
      }
    }

    return NextResponse.json({ duplicateGroups });
  } catch (error: any) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to find duplicates' },
      { status: 500 }
    );
  }
}

