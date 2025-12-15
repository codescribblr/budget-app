import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * POST /api/debug/fix-orphaned-splits
 * Fixes transaction splits that have null transaction_id or category_id
 * This can happen if data was imported incorrectly
 */
export async function POST() {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Find orphaned splits (splits with null transaction_id or category_id)
    const { data: orphanedSplits, error: orphanedError } = await supabase
      .from('transaction_splits')
      .select('id, transaction_id, category_id')
      .or('transaction_id.is.null,category_id.is.null')
      .limit(1000);

    if (orphanedError) {
      return NextResponse.json({ error: orphanedError.message }, { status: 500 });
    }

    const orphanedCount = orphanedSplits?.length || 0;

    // Find splits that reference non-existent transactions
    const { data: allSplits } = await supabase
      .from('transaction_splits')
      .select('id, transaction_id, category_id')
      .not('transaction_id', 'is', null)
      .not('category_id', 'is', null);

    const transactionIds = new Set((allSplits || []).map(s => s.transaction_id));
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('budget_account_id', accountId)
      .in('id', Array.from(transactionIds));

    const existingTransactionIds = new Set((existingTransactions || []).map(t => t.id));
    const splitsWithInvalidTransactionIds = (allSplits || []).filter(
      s => !existingTransactionIds.has(s.transaction_id)
    );

    // Find splits that reference non-existent categories
    const categoryIds = new Set((allSplits || []).map(s => s.category_id));
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id')
      .in('id', Array.from(categoryIds));

    const existingCategoryIds = new Set((existingCategories || []).map(c => c.id));
    const splitsWithInvalidCategoryIds = (allSplits || []).filter(
      s => !existingCategoryIds.has(s.category_id)
    );

    // Get transactions without splits
    let query = supabase
      .from('transactions')
      .select('id, date, description')
      .eq('budget_account_id', accountId)
      .gte('date', '2025-01-01')
      .lte('date', '2025-12-31');
    
    // Only apply .not() if there are existing transaction IDs
    if (existingTransactionIds.size > 0) {
      query = query.not('id', 'in', `(${Array.from(existingTransactionIds).join(',')})`);
    }
    
    const { data: transactionsWithoutSplits } = await query;

    return NextResponse.json({
      orphanedSplits: {
        count: orphanedCount,
        sample: orphanedSplits?.slice(0, 10) || []
      },
      splitsWithInvalidTransactionIds: {
        count: splitsWithInvalidTransactionIds.length,
        sample: splitsWithInvalidTransactionIds.slice(0, 10)
      },
      splitsWithInvalidCategoryIds: {
        count: splitsWithInvalidCategoryIds.length,
        sample: splitsWithInvalidCategoryIds.slice(0, 10)
      },
      transactionsWithoutSplits: {
        count: transactionsWithoutSplits?.length || 0,
        sample: transactionsWithoutSplits?.slice(0, 10) || []
      },
      message: 'This endpoint only reports issues. To fix, you may need to re-import your backup data.'
    });
  } catch (error: any) {
    console.error('Error checking orphaned splits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
