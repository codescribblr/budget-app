import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getActiveAccountId } from '@/lib/account-context';
import { getTransactionById } from '@/lib/supabase-queries';
import { logBalanceChange } from '@/lib/audit/category-balance-audit';

export async function POST(request: Request) {
  try {
    // Check write access
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { baseTransactionId, transactionsToMerge, mergeData } = await request.json();

    if (!baseTransactionId || !Array.isArray(transactionsToMerge) || !mergeData) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Get all transactions being merged (base + others)
    const allTransactionIds = [baseTransactionId, ...transactionsToMerge];
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        budget_account_id,
        date,
        description,
        total_amount,
        transaction_type,
        is_historical,
        splits:transaction_splits(
          id,
          category_id,
          amount
        )
      `)
      .in('id', allTransactionIds)
      .eq('budget_account_id', accountId);

    if (fetchError || !transactions || transactions.length !== allTransactionIds.length) {
      return NextResponse.json(
        { error: 'Failed to fetch transactions or unauthorized' },
        { status: 400 }
      );
    }

    // Validate split amounts match transaction total
    const totalSplitAmount = mergeData.splits.reduce((sum: number, split: any) => sum + split.amount, 0);
    const baseTransaction = transactions.find(t => t.id === baseTransactionId);
    if (!baseTransaction) {
      return NextResponse.json({ error: 'Base transaction not found' }, { status: 400 });
    }

    const expectedTotal = baseTransaction.total_amount;
    if (Math.abs(totalSplitAmount - expectedTotal) > 0.01) {
      return NextResponse.json(
        { error: `Split amounts (${totalSplitAmount}) must equal transaction total (${expectedTotal})` },
        { status: 400 }
      );
    }

    // Step 1: Reverse envelope updates for all transactions being merged (only if non-historical)
    for (const transaction of transactions) {
      if (!transaction.is_historical) {
        for (const split of transaction.splits) {
          const { data: category } = await supabase
            .from('categories')
            .select('is_system, current_balance')
            .eq('id', split.category_id)
            .single();

          if (category && !category.is_system) {
            const oldBalance = Number(category.current_balance);
            // Reverse the transaction's impact on envelope
            const balanceChange = transaction.transaction_type === 'income'
              ? -split.amount  // Reverse income: subtract
              : split.amount;   // Reverse expense: add back

            await supabase
              .from('categories')
              .update({
                current_balance: oldBalance + balanceChange,
                updated_at: new Date().toISOString(),
              })
              .eq('id', split.category_id);

            // Log balance change
            await logBalanceChange(
              split.category_id,
              oldBalance,
              oldBalance + balanceChange,
              'transaction_merge',
              {
                transaction_id: transaction.id,
                transaction_description: transaction.description,
                merge_reason: 'Reversing original transaction before merge',
                merged_transaction_ids: allTransactionIds,
              }
            );
          }
        }
      }
    }

    // Step 2: Update base transaction with merged data
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        date: mergeData.date,
        description: mergeData.description,
        merchant_group_id: mergeData.merchant_group_id || null,
        is_historical: mergeData.is_historical,
        transaction_type: mergeData.transaction_type,
        total_amount: expectedTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', baseTransactionId)
      .eq('budget_account_id', accountId);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      );
    }

    // Step 3: Delete old splits and create new ones
    const { error: deleteSplitsError } = await supabase
      .from('transaction_splits')
      .delete()
      .eq('transaction_id', baseTransactionId);

    if (deleteSplitsError) {
      console.error('Error deleting splits:', deleteSplitsError);
      return NextResponse.json(
        { error: 'Failed to update splits' },
        { status: 500 }
      );
    }

    // Insert new splits
    const splitsToInsert = mergeData.splits.map((split: any) => ({
      transaction_id: baseTransactionId,
      category_id: split.category_id,
      amount: split.amount,
    }));

    const { error: insertSplitsError } = await supabase
      .from('transaction_splits')
      .insert(splitsToInsert);

    if (insertSplitsError) {
      console.error('Error inserting splits:', insertSplitsError);
      return NextResponse.json(
        { error: 'Failed to create splits' },
        { status: 500 }
      );
    }

    // Step 4: Apply envelope updates for merged transaction (only if non-historical)
    if (!mergeData.is_historical) {
      for (const split of mergeData.splits) {
        const { data: category } = await supabase
          .from('categories')
          .select('is_system, current_balance')
          .eq('id', split.category_id)
          .single();

        if (category && !category.is_system) {
          const oldBalance = Number(category.current_balance);
          const balanceChange = mergeData.transaction_type === 'income'
            ? split.amount   // Income adds
            : -split.amount;  // Expense subtracts

          await supabase
            .from('categories')
            .update({
              current_balance: oldBalance + balanceChange,
              updated_at: new Date().toISOString(),
            })
            .eq('id', split.category_id);

          // Log balance change
          await logBalanceChange(
            split.category_id,
            oldBalance,
            oldBalance + balanceChange,
            'transaction_merge',
            {
              transaction_id: baseTransactionId,
              transaction_description: mergeData.description,
              merge_reason: 'Applying merged transaction after combining duplicates',
              merged_transaction_ids: allTransactionIds,
              merged_count: transactionsToMerge.length + 1,
            }
          );
        }
      }
    }

    // Step 5: Collect all imported_transaction_ids from all transactions being merged
    // This includes both the base transaction and the ones being merged
    const allTransactionIdsForLinks = [baseTransactionId, ...transactionsToMerge];
    const { data: existingLinks, error: linksFetchError } = await supabase
      .from('imported_transaction_links')
      .select('imported_transaction_id')
      .in('transaction_id', allTransactionIdsForLinks);

    if (linksFetchError) {
      console.error('Error fetching import links:', linksFetchError);
    }

    // Extract unique imported_transaction_ids
    const importedTransactionIds = new Set<number>();
    if (existingLinks) {
      existingLinks.forEach(link => {
        importedTransactionIds.add(link.imported_transaction_id);
      });
    }

    // Step 6: Delete other transactions (but preserve imported_transaction records)
    for (const transactionId of transactionsToMerge) {
      // Delete imported_transaction_links (we'll recreate them for the merged transaction)
      await supabase
        .from('imported_transaction_links')
        .delete()
        .eq('transaction_id', transactionId);

      // Delete transaction splits
      await supabase
        .from('transaction_splits')
        .delete()
        .eq('transaction_id', transactionId);

      // Delete transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('budget_account_id', accountId);
    }

    // Step 7: Re-link all imported_transaction records to the merged transaction
    // This ensures duplicate detection continues to work for all original hashes
    if (importedTransactionIds.size > 0) {
      // First, delete any existing links for the base transaction (we'll recreate them all)
      await supabase
        .from('imported_transaction_links')
        .delete()
        .eq('transaction_id', baseTransactionId);

      // Create new links from all imported_transaction_ids to the merged transaction
      const newLinks = Array.from(importedTransactionIds).map(importedTxnId => ({
        imported_transaction_id: importedTxnId,
        transaction_id: baseTransactionId,
      }));

      const { error: createLinksError } = await supabase
        .from('imported_transaction_links')
        .insert(newLinks);

      if (createLinksError) {
        console.error('Error creating import links:', createLinksError);
        // Non-critical error, but log it
      }
    }

    // Step 6: Get and return merged transaction
    const mergedTransaction = await getTransactionById(baseTransactionId);

    return NextResponse.json({
      success: true,
      transaction: mergedTransaction,
    });
  } catch (error: any) {
    console.error('Error merging transactions:', error);
    return NextResponse.json(
      { error: 'Failed to merge transactions' },
      { status: 500 }
    );
  }
}


