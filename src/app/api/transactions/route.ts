import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, createTransaction } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateTransactionRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Check for date filter parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // If date filters are provided, use a more efficient query that filters server-side
    // Otherwise, get all transactions (but this may be limited to 1000 by Supabase default)
    const transactions = startDate || endDate 
      ? await getAllTransactionsWithDateFilter(startDate || undefined, endDate || undefined)
      : await getAllTransactions();
    
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}

// Helper function to fetch transactions with date filtering (server-side)
async function getAllTransactionsWithDateFilter(startDate?: string, endDate?: string) {
  const { getAllTransactions } = await import('@/lib/supabase-queries');
  const { getAuthenticatedUser } = await import('@/lib/supabase-queries');
  const { getActiveAccountId } = await import('@/lib/account-context');
  
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    throw new Error('No active account');
  }

  // Build query with date filters
  let query = supabase
    .from('transactions')
    .select(`
      *,
      merchant_groups (
        display_name
      ),
      accounts (
        name
      ),
      credit_cards (
        name
      ),
      transaction_tags (
        tags (*)
      )
    `)
    .eq('budget_account_id', accountId);

  // Apply date filters
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  query = query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10000); // Increase limit for date-filtered queries

  const { data: transactions, error: txError } = await query;

  if (txError) throw txError;

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get all transaction IDs
  const transactionIds = transactions.map((t: any) => t.id);

  // Get ALL splits for ALL transactions in a single query
  const { data: allSplits, error: splitError } = await supabase
    .from('transaction_splits')
    .select(`
      *,
      categories (
        name
      )
    `)
    .in('transaction_id', transactionIds);

  if (splitError) throw splitError;

  // Group splits by transaction_id
  const splitsByTransaction = new Map<number, any[]>();
  (allSplits || []).forEach((split: any) => {
    if (!splitsByTransaction.has(split.transaction_id)) {
      splitsByTransaction.set(split.transaction_id, []);
    }
    splitsByTransaction.get(split.transaction_id)!.push({
      ...split,
      category_name: split.categories?.name || 'Unknown',
    });
  });

  // Build the final result (same format as getAllTransactions)
  const transactionsWithSplits = transactions.map((txn: any) => ({
    ...txn,
    splits: splitsByTransaction.get(txn.id) || [],
    merchant_name: txn.merchant_groups?.display_name || null,
    account_name: txn.accounts?.name || null,
    credit_card_name: txn.credit_cards?.name || null,
    tags: (txn.transaction_tags || []).map((tt: any) => tt.tags).filter(Boolean),
  }));

  return transactionsWithSplits;
}

export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as CreateTransactionRequest;
    const transaction = await createTransaction(body);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
