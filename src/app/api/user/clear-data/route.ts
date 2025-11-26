import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkOwnerAccess } from '@/lib/api-helpers';

/**
 * DELETE /api/user/clear-data
 * 
 * Clears all data for the active account.
 * This is a destructive action that cannot be undone.
 * Only account owners can perform this action.
 */
export async function DELETE() {
  try {
    // Check if user is account owner
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const { getActiveAccountId } = await import('@/lib/account-context');
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Delete in order (respecting foreign key constraints)
    // Delete all data for the active account
    // Note: transaction_splits will be deleted automatically via CASCADE when transactions are deleted
    
    // Delete transactions (this will CASCADE delete transaction_splits)
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('budget_account_id', accountId);
    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError);
      throw transactionsError;
    }

    // Delete imported transactions (this will CASCADE delete imported_transaction_links)
    const { error: importedError } = await supabase
      .from('imported_transactions')
      .delete()
      .eq('account_id', accountId);
    if (importedError) {
      console.error('Error deleting imported transactions:', importedError);
      throw importedError;
    }

    // Delete other account-scoped data
    const accountScopedTables = [
      { table: 'merchant_category_rules', field: 'account_id' },
      { table: 'merchant_mappings', field: 'account_id' },
      { table: 'merchant_groups', field: 'account_id' },
      { table: 'pending_checks', field: 'account_id' },
      { table: 'credit_cards', field: 'account_id' },
      { table: 'accounts', field: 'account_id' },
      { table: 'categories', field: 'account_id' },
      { table: 'settings', field: 'account_id' },
      { table: 'goals', field: 'account_id' },
      { table: 'loans', field: 'account_id' },
      { table: 'csv_import_templates', field: 'account_id' },
      { table: 'category_monthly_funding', field: 'account_id' },
      { table: 'user_feature_flags', field: 'account_id' },
    ];

    for (const { table, field } of accountScopedTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(field, accountId);

      if (error) {
        console.error(`Error deleting ${table}:`, error);
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'All user data cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing user data:', error);
    return NextResponse.json(
      { error: 'Failed to clear user data' },
      { status: 500 }
    );
  }
}

