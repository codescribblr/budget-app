import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, createTransaction, getTransactionsPaginated } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateTransactionRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if pagination parameters are present - if so, use paginated endpoint
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    
    if (page || pageSize || searchParams.get('q') || searchParams.get('categoryId') || 
        searchParams.get('merchantGroupId') || searchParams.get('transactionType') || 
        searchParams.get('tags') || searchParams.get('accountId')) {
      // Use paginated endpoint with all filters
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 50;
      
      // Parse filters
      const searchQuery = searchParams.get('q') || undefined;
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;
      
      const categoryIdParam = searchParams.get('categoryId');
      const categoryIds = categoryIdParam 
        ? categoryIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : undefined;
      
      const merchantGroupIdParam = searchParams.get('merchantGroupId');
      const merchantGroupIds = merchantGroupIdParam
        ? merchantGroupIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : undefined;
      
      const transactionTypeParam = searchParams.get('transactionType');
      const transactionTypes = transactionTypeParam
        ? transactionTypeParam.split(',').filter(t => t === 'income' || t === 'expense') as ('income' | 'expense')[]
        : undefined;
      
      const tagsParam = searchParams.get('tags');
      const tagIds = tagsParam
        ? tagsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : undefined;
      
      // Parse account filter (supports both account IDs and credit card IDs)
      const accountIdParam = searchParams.get('accountId');
      const accountIds: number[] = [];
      const creditCardIds: number[] = [];
      
      if (accountIdParam) {
        accountIdParam.split(',').forEach(item => {
          const trimmed = item.trim();
          if (trimmed.startsWith('account-')) {
            const id = parseInt(trimmed.replace('account-', ''));
            if (!isNaN(id)) accountIds.push(id);
          } else if (trimmed.startsWith('card-')) {
            const id = parseInt(trimmed.replace('card-', ''));
            if (!isNaN(id)) creditCardIds.push(id);
          }
        });
      }
      
      const sortBy = (searchParams.get('sortBy') as 'date' | 'description' | 'merchant' | 'amount') || 'date';
      const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc';
      
      const result = await getTransactionsPaginated({
        page: pageNum,
        pageSize: pageSizeNum,
        searchQuery,
        startDate,
        endDate,
        categoryIds,
        merchantGroupIds,
        transactionTypes,
        tagIds,
        accountIds: accountIds.length > 0 ? accountIds : undefined,
        creditCardIds: creditCardIds.length > 0 ? creditCardIds : undefined,
        sortBy,
        sortDirection,
      });
      
      return NextResponse.json(result);
    }
    
    // Legacy: If no pagination params, return all transactions (for backward compatibility)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
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

