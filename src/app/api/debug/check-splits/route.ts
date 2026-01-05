import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET() {
  try {
    const supabase = await createClient();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Get a sample of transactions from 2025
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, date, description, budget_account_id')
      .eq('budget_account_id', accountId)
      .gte('date', '2025-01-01')
      .lte('date', '2025-12-31')
      .limit(10);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ 
        message: 'No transactions found in date range',
        transactions: []
      });
    }

    // Check splits for each transaction
    const transactionIds = transactions.map(t => t.id);
    const { data: allSplits, error: splitError } = await supabase
      .from('transaction_splits')
      .select('id, transaction_id, category_id, amount')
      .in('transaction_id', transactionIds);

    if (splitError) {
      return NextResponse.json({ error: splitError.message }, { status: 500 });
    }

    // Group splits by transaction
    const splitsByTransaction = new Map<number, any[]>();
    (allSplits || []).forEach(split => {
      if (!splitsByTransaction.has(split.transaction_id)) {
        splitsByTransaction.set(split.transaction_id, []);
      }
      splitsByTransaction.get(split.transaction_id)!.push(split);
    });

    // Get total counts
    const { count: totalTransactionsCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('budget_account_id', accountId)
      .gte('date', '2025-01-01')
      .lte('date', '2025-12-31');

    const allTransactionIds = await supabase
      .from('transactions')
      .select('id')
      .eq('budget_account_id', accountId)
      .gte('date', '2025-01-01')
      .lte('date', '2025-12-31');

    const { count: totalSplitsCount } = await supabase
      .from('transaction_splits')
      .select('*', { count: 'exact', head: true })
      .in('transaction_id', allTransactionIds.data?.map(t => t.id) || []);

    const result = {
      totalTransactions: totalTransactionsCount || 0,
      totalSplits: totalSplitsCount || 0,
      sampleTransactions: transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description.substring(0, 60),
        splitsCount: splitsByTransaction.get(t.id)?.length || 0,
        splits: splitsByTransaction.get(t.id) || []
      }))
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking splits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

