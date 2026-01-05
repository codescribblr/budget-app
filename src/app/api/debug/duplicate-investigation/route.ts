import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/debug/duplicate-investigation
 * Diagnostic endpoint to investigate duplicate detection issues
 * Query params:
 *   - date: transaction date (YYYY-MM-DD)
 *   - amount: transaction amount
 *   - description: transaction description (optional)
 */
export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const amount = searchParams.get('amount');
    const description = searchParams.get('description');

    if (!date || !amount) {
      return NextResponse.json(
        { error: 'date and amount query parameters are required' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Check transactions table
    let transactionsQuery = supabase
      .from('transactions')
      .select('id, date, description, total_amount, budget_account_id, created_at')
      .eq('budget_account_id', accountId)
      .eq('date', date)
      .eq('total_amount', Math.abs(amountNum));

    if (description) {
      transactionsQuery = transactionsQuery.ilike('description', `%${description}%`);
    }

    const { data: transactions, error: txError } = await transactionsQuery;

    // Check imported_transactions table
    let importedQuery = supabase
      .from('imported_transactions')
      .select('id, transaction_date, description, amount, account_id, user_id, hash, import_date, source_type, source_identifier')
      .eq('user_id', user.id)
      .eq('transaction_date', date)
      .eq('amount', Math.abs(amountNum));

    if (description) {
      importedQuery = importedQuery.ilike('description', `%${description}%`);
    }

    const { data: importedTransactions, error: importedError } = await importedQuery;

    // Also check ALL imported_transactions for this user (to see if there are records with different account_id)
    const { data: allImportedForUser, error: allImportedError } = await supabase
      .from('imported_transactions')
      .select('id, transaction_date, description, amount, account_id, user_id, hash, import_date')
      .eq('user_id', user.id)
      .eq('transaction_date', date)
      .eq('amount', Math.abs(amountNum));

    // Check queued_imports table
    const { data: queuedImports, error: queuedError } = await supabase
      .from('queued_imports')
      .select('id, transaction_date, description, amount, account_id, hash, status, source_batch_id')
      .eq('account_id', accountId)
      .eq('transaction_date', date)
      .eq('amount', Math.abs(amountNum));

    return NextResponse.json({
      accountId,
      userId: user.id,
      searchCriteria: {
        date,
        amount: amountNum,
        description: description || null,
      },
      transactions: {
        data: transactions || [],
        error: txError?.message || null,
        count: transactions?.length || 0,
      },
      importedTransactions: {
        data: importedTransactions || [],
        error: importedError?.message || null,
        count: importedTransactions?.length || 0,
      },
      allImportedForUser: {
        data: allImportedForUser || [],
        error: allImportedError?.message || null,
        count: allImportedForUser?.length || 0,
        differentAccountIds: allImportedForUser?.filter(it => it.account_id !== accountId) || [],
      },
      queuedImports: {
        data: queuedImports || [],
        error: queuedError?.message || null,
        count: queuedImports?.length || 0,
      },
      analysis: {
        existsInTransactions: (transactions?.length || 0) > 0,
        existsInImportedTransactions: (importedTransactions?.length || 0) > 0,
        existsInQueuedImports: (queuedImports?.length || 0) > 0,
        hasDifferentAccountIds: (allImportedForUser?.filter(it => it.account_id !== accountId).length || 0) > 0,
      },
    });
  } catch (error: any) {
    console.error('Error in duplicate investigation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to investigate duplicates' },
      { status: 500 }
    );
  }
}


