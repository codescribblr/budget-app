import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserAccountCount } from '@/lib/account-context';
import { checkOwnerAccess } from '@/lib/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
    const { supabase, user } = await getAuthenticatedUser();
    
    // Use service role client to bypass RLS and get accurate account count
    // This ensures we see all accounts including ones that might be hidden by RLS
    const serviceRoleSupabase = createServiceRoleClient();
    
    // Check if user has any accounts (excluding soft-deleted ones)
    // Count owned accounts (non-deleted) using service role to bypass RLS
    const { count: ownedCount } = await serviceRoleSupabase
      .from('budget_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .is('deleted_at', null);
    
    // Count shared accounts (where account is not deleted)
    // Use service role client to bypass RLS
    const { data: sharedAccounts } = await serviceRoleSupabase
      .from('account_users')
      .select('account_id, budget_accounts!inner(deleted_at)')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    // Filter out entries where the account has been soft-deleted
    const sharedCount = sharedAccounts?.filter(
      (au: any) => !au.budget_accounts?.deleted_at
    ).length || 0;
    
    const totalAccountCount = (ownedCount || 0) + sharedCount;
    
    if (totalAccountCount > 0) {
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
      if (sharedCount > 0) {
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

    // Get all accounts owned by this user (including soft-deleted ones for cleanup)
    const { data: ownedAccounts } = await serviceRoleSupabase
      .from('budget_accounts')
      .select('id')
      .eq('owner_id', user.id);

    // Delete all data for each account the user owns
    // Since data is now scoped by account_id/budget_account_id, we need to delete by account
    if (ownedAccounts && ownedAccounts.length > 0) {
      const accountIds = ownedAccounts.map(acc => acc.id);
      
      // First, delete all account-scoped data (this will cascade delete related records)
      // Use service role client to delete account-scoped data (bypasses RLS)
      const accountScopedTables = [
        { table: 'transactions', field: 'budget_account_id' },
        { table: 'imported_transactions', field: 'account_id' },
        { table: 'merchant_mappings', field: 'account_id' },
        { table: 'merchant_groups', field: 'account_id' },
        { table: 'merchant_category_rules', field: 'account_id' },
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
        { table: 'ai_conversations', field: 'account_id' },
        { table: 'tags', field: 'account_id' },
        { table: 'tag_rules', field: 'account_id' },
        { table: 'recurring_transactions', field: 'budget_account_id' },
        { table: 'non_cash_assets', field: 'account_id' },
      ];

      for (const { table, field } of accountScopedTables) {
        const { error } = await serviceRoleSupabase
          .from(table)
          .delete()
          .in(field, accountIds);

        if (error) {
          console.error(`Error deleting ${table}:`, error);
          // Don't throw - some tables might not exist or might have different field names
          // Continue with deletion
        }
      }
      
      // Delete account_invitations for these accounts (before deleting account_users)
      const { error: deleteInvitationsError } = await serviceRoleSupabase
        .from('account_invitations')
        .delete()
        .in('account_id', accountIds);
      
      if (deleteInvitationsError) {
        console.error('Error deleting account_invitations:', deleteInvitationsError);
        // Don't throw - invitations might not exist
      }
      
      // Delete account_users entries for these accounts
      const { error: deleteAccountUsersError } = await serviceRoleSupabase
        .from('account_users')
        .delete()
        .in('account_id', accountIds);
      
      if (deleteAccountUsersError) {
        console.error('Error deleting account_users:', deleteAccountUsersError);
        // Don't throw - account_users might already be deleted
      }
      
      // CRITICAL: Hard delete budget_accounts entries (not soft delete)
      // This is required because foreign key constraints prevent user deletion
      // if budget_accounts entries still reference the user, even if soft-deleted
      const { error: deleteBudgetAccountsError } = await serviceRoleSupabase
        .from('budget_accounts')
        .delete()
        .eq('owner_id', user.id);
      
      if (deleteBudgetAccountsError) {
        console.error('Error hard-deleting budget accounts:', deleteBudgetAccountsError);
        throw deleteBudgetAccountsError;
      }
    }
    
    // Delete account_invitations where user is the inviter
    const { error: deleteInvitationsByInviterError } = await serviceRoleSupabase
      .from('account_invitations')
      .delete()
      .eq('invited_by', user.id);
    
    if (deleteInvitationsByInviterError) {
      console.error('Error deleting invitations by inviter:', deleteInvitationsByInviterError);
      // Don't throw - invitations might not exist
    }

    // Also delete any remaining user-scoped data (for backwards compatibility)
    // Some tables might still have user_id but no account_id
    const userScopedTables = [
      'merchant_mappings',
      'pending_checks',
      'credit_cards',
      'accounts',
      'categories',
      'settings',
    ];

    for (const table of userScopedTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // Ignore errors for tables that might not have user_id anymore
        // This is for backwards compatibility only
        console.warn(`Warning: Could not delete ${table} by user_id (might be account-scoped):`, error.message);
      }
    }

    // Then delete the user account
    // Use service role client for admin API operations (reuse the one we already created)
    const { error: deleteError } = await serviceRoleSupabase.auth.admin.deleteUser(user.id);

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


