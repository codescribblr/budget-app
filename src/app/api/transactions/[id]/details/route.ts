import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

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

    // Get transaction with all related data
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        merchant_groups (
          display_name
        ),
        accounts (
          name,
          account_type
        ),
        credit_cards (
          name
        )
      `)
      .eq('id', transactionId)
      .eq('budget_account_id', accountId)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get splits with category names
    const { data: splits, error: splitError } = await supabase
      .from('transaction_splits')
      .select(`
        *,
        categories (
          name,
          is_system
        )
      `)
      .eq('transaction_id', transactionId);

    if (splitError) {
      console.error('Error fetching splits:', splitError);
    }

    // Get import metadata if available
    const { data: importLinks, error: linkError } = await supabase
      .from('imported_transaction_links')
      .select(`
        imported_transaction_id,
        created_at,
        imported_transactions (
          id,
          import_date,
          source_type,
          source_identifier,
          transaction_date,
          merchant,
          description,
          amount,
          hash,
          imported_at
        )
      `)
      .eq('transaction_id', transactionId);

    if (linkError) {
      console.error('Error fetching import links:', linkError);
    }

    // Format the response
    const response = {
      transaction: {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        total_amount: transaction.total_amount,
        transaction_type: transaction.transaction_type || 'expense',
        merchant_group_id: transaction.merchant_group_id,
        merchant_name: (transaction as any).merchant_groups?.display_name || null,
        account_id: transaction.account_id,
        account_name: (transaction as any).accounts?.name || null,
        account_type: (transaction as any).accounts?.account_type || null,
        credit_card_id: transaction.credit_card_id,
        credit_card_name: (transaction as any).credit_cards?.name || null,
        is_historical: transaction.is_historical || false,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      },
      splits: (splits || []).map((split: any) => ({
        id: split.id,
        category_id: split.category_id,
        category_name: split.categories?.name || 'Unknown',
        category_is_system: split.categories?.is_system || false,
        amount: split.amount,
        created_at: split.created_at,
      })),
      importMetadata: (importLinks || []).map((link: any) => ({
        link_created_at: link.created_at,
        imported_transaction: link.imported_transactions ? {
          id: link.imported_transactions.id,
          import_date: link.imported_transactions.import_date,
          source_type: link.imported_transactions.source_type,
          source_identifier: link.imported_transactions.source_identifier,
          transaction_date: link.imported_transactions.transaction_date,
          merchant: link.imported_transactions.merchant,
          description: link.imported_transactions.description,
          amount: link.imported_transactions.amount,
          hash: link.imported_transactions.hash,
          imported_at: link.imported_transactions.imported_at,
        } : null,
      })),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching transaction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}

