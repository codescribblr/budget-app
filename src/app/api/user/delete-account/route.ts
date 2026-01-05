import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserAccountCount } from '@/lib/account-context';
import { checkOwnerAccess } from '@/lib/api-helpers';

/**
 * DELETE /api/user/delete-account
 * 
 * Deletes the user's account and all associated data.
 * This is a destructive action that cannot be undone.
 * 
 * CRITICAL: User can ONLY delete their account if they have NO accounts (owned or shared).
 * Only account owners can delete accounts.
 */
export async function DELETE() {
  try {
    // Check if user is account owner (they must own at least one account to delete their user account)
    // But we also need to check if they have any accounts at all
    const { supabase, user } = await getAuthenticatedUser();
    
    // Check if user has any accounts
    const accountCount = await getUserAccountCount();
    
    if (accountCount > 0) {
      // Count owned vs shared
      const { count: ownedCount } = await supabase
        .from('budget_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      
      const { count: sharedCount } = await supabase
        .from('account_users')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      // If user owns accounts, they can delete their user account
      // But they must leave/delete all accounts first
      if ((ownedCount || 0) > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete account while owner of accounts',
            ownedAccounts: ownedCount || 0,
            sharedAccounts: sharedCount || 0,
            message: 'To delete your account, first delete all accounts you own and leave all shared accounts.',
          },
          { status: 400 }
        );
      }
      
      // If user is only a member (not owner), they cannot delete their user account
      if ((sharedCount || 0) > 0) {
        return NextResponse.json(
          {
            error: 'Unauthorized: Only account owners can delete accounts. Please leave all shared accounts first.',
            ownedAccounts: 0,
            sharedAccounts: sharedCount || 0,
          },
          { status: 403 }
        );
      }
    }

    // First, delete all user data (same as clear-data)
    // Note: transaction_splits and imported_transaction_links don't have user_id
    // They will be deleted automatically via CASCADE when their parent records are deleted
    const tables = [
      'transactions',           // This will CASCADE delete transaction_splits
      'imported_transactions',  // This will CASCADE delete imported_transaction_links
      'merchant_mappings',
      'pending_checks',
      'credit_cards',
      'accounts',
      'categories',
      'settings',
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error(`Error deleting ${table}:`, error);
        throw error;
      }
    }

    // Then delete the user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user account:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}


