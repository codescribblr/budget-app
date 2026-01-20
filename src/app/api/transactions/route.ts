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
// Uses pagination to handle large date ranges that exceed Supabase limits
async function getAllTransactionsWithDateFilter(startDate?: string, endDate?: string) {
  const { getAuthenticatedUser } = await import('@/lib/supabase-queries');
  const { getActiveAccountId } = await import('@/lib/account-context');
  
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    throw new Error('No active account');
  }

  const PAGE_SIZE = 1000; // Supabase's default limit
  const allTransactions: any[] = [];
  let page = 0;
  let hasMore = true;

  // Fetch transactions in pages until we get all of them
  while (hasMore) {
    // Build base query
    let query = supabase
      .from('transactions')
      .select(`
        *,
      merchant_groups (
        display_name,
        global_merchant_id,
        global_merchants (
          logo_url,
          icon_name,
          status
        )
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
      `, { count: 'exact' })
      .eq('budget_account_id', accountId);

    // Apply date filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply pagination
    const offset = page * PAGE_SIZE;
    query = query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data: transactions, error: txError, count } = await query;

    if (txError) throw txError;

    if (!transactions || transactions.length === 0) {
      hasMore = false;
      break;
    }

    allTransactions.push(...transactions);

    // Check if we've fetched all transactions
    const totalCount = count || 0;
    if (allTransactions.length >= totalCount || transactions.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (allTransactions.length === 0) {
    return [];
  }

  // Get all transaction IDs
  const transactionIds = allTransactions.map((t: any) => t.id);

  // Fetch splits in batches (Supabase has a limit on IN clause size)
  const SPLIT_BATCH_SIZE = 1000;
  const allSplits: any[] = [];
  
  for (let i = 0; i < transactionIds.length; i += SPLIT_BATCH_SIZE) {
    const batchIds = transactionIds.slice(i, i + SPLIT_BATCH_SIZE);
    const { data: splits, error: splitError } = await supabase
      .from('transaction_splits')
      .select(`
        *,
        categories (
          name
        )
      `)
      .in('transaction_id', batchIds);

    if (splitError) throw splitError;
    if (splits) {
      allSplits.push(...splits);
    }
  }

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

  // Helper function to extract global merchant info
  const getGlobalMerchantInfo = (merchantGroups: any) => {
    if (!merchantGroups?.global_merchants) return null;
    const globalMerchant = Array.isArray(merchantGroups.global_merchants)
      ? merchantGroups.global_merchants[0]
      : merchantGroups.global_merchants;
    if (!globalMerchant || globalMerchant.status !== 'active') return null;
    return {
      logo_url: globalMerchant.logo_url || null,
      icon_name: globalMerchant.icon_name || null,
    };
  };

  // Build the final result (same format as getAllTransactions)
  const transactionsWithSplits = allTransactions.map((txn: any) => {
    const globalMerchant = getGlobalMerchantInfo(txn.merchant_groups);
    return {
      ...txn,
      splits: splitsByTransaction.get(txn.id) || [],
      merchant_name: txn.merchant_groups?.display_name || null,
      merchant_logo_url: globalMerchant?.logo_url || null,
      merchant_icon_name: globalMerchant?.icon_name || null,
      account_name: txn.accounts?.name || null,
      credit_card_name: txn.credit_cards?.name || null,
      tags: (txn.transaction_tags || []).map((tt: any) => tt.tags).filter(Boolean),
    };
  });

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

