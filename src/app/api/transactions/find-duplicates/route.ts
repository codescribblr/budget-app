import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createHash } from 'crypto';

export async function GET() {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Get all transactions with their splits, categories, and merchant info
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        total_amount,
        transaction_type,
        merchant_group_id,
        merchant_override_id,
        is_historical,
        account_id,
        credit_card_id,
        created_at,
        merchant_groups (
          display_name,
          global_merchant_id,
          global_merchants (
            display_name,
            status
          )
        ),
        merchant_override:global_merchants!merchant_override_id (
          display_name,
          status
        ),
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
        
        // Helper function to extract merchant name from transaction
        const getMerchantName = (txn: any): string | null => {
          // Prefer merchant override
          if (txn.merchant_override?.display_name) {
            return txn.merchant_override.display_name;
          }
          
          // Then check global merchant from merchant group
          const merchantGroup = txn.merchant_groups;
          if (merchantGroup?.global_merchants) {
            const globalMerchant = Array.isArray(merchantGroup.global_merchants)
              ? merchantGroup.global_merchants[0]
              : merchantGroup.global_merchants;
            if (globalMerchant && globalMerchant.status === 'active' && globalMerchant.display_name) {
              return globalMerchant.display_name;
            }
          }
          
          // Fall back to merchant group display name
          if (merchantGroup?.display_name) {
            return merchantGroup.display_name;
          }
          
          return null;
        };
        
        duplicateGroups.push({
          amount: txn1.total_amount,
          transactions: duplicates.map(txn => ({
            id: txn.id,
            date: txn.date,
            description: txn.description,
            total_amount: txn.total_amount,
            transaction_type: txn.transaction_type,
            merchant_group_id: txn.merchant_group_id,
            merchant_name: getMerchantName(txn),
            is_historical: txn.is_historical,
            account_id: txn.account_id,
            credit_card_id: txn.credit_card_id,
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

    // Filter out reviewed groups
    if (duplicateGroups.length > 0) {
      // Get all reviewed groups for this account
      const { data: reviewedGroups } = await supabase
        .from('duplicate_group_reviews')
        .select('transaction_ids')
        .eq('budget_account_id', accountId);

      // Create a set of reviewed transaction ID arrays (sorted for comparison)
      const reviewedSets = new Set<string>();
      reviewedGroups?.forEach(review => {
        const sortedIds = [...review.transaction_ids].sort((a, b) => a - b).join(',');
        reviewedSets.add(sortedIds);
      });

      // Filter duplicate groups
      const filteredGroups = duplicateGroups.filter(group => {
        const groupTransactionIds = group.transactions.map((t: any) => t.id).sort((a: number, b: number) => a - b);
        const groupKey = groupTransactionIds.join(',');
        return !reviewedSets.has(groupKey);
      });

      return NextResponse.json({ duplicateGroups: filteredGroups });
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


