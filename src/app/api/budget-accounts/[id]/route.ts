import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PUT /api/budget-accounts/[id]
 * Update a budget account (currently only supports renaming)
 * Only account owners can update their accounts
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { id } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      );
    }

    // Verify user is the account owner
    const { data: account, error: accountError } = await supabase
      .from('budget_accounts')
      .select('owner_id, name')
      .eq('id', accountId)
      .is('deleted_at', null)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only account owners can rename accounts' },
        { status: 403 }
      );
    }

    // Update the account name
    const { data: updatedAccount, error: updateError } = await supabase
      .from('budget_accounts')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('owner_id', user.id)
      .select('id, name, owner_id, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating budget account:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount,
    });
  } catch (error: any) {
    console.error('Error updating budget account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget-accounts/[id]
 * Delete a budget account (soft delete)
 * Only account owners can delete their accounts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { id } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    // Verify user is the account owner
    const { data: account, error: accountError } = await supabase
      .from('budget_accounts')
      .select('owner_id, name')
      .eq('id', accountId)
      .is('deleted_at', null)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only account owners can delete accounts' },
        { status: 403 }
      );
    }

    // Get count of ALL accounts for this user BEFORE deletion
    // This includes the account being deleted
    const { count: ownedCountBefore } = await supabase
      .from('budget_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    // Count shared accounts (where user is a member, not owner)
    const { data: sharedAccounts } = await supabase
      .from('account_users')
      .select('account_id, budget_accounts!inner(owner_id, deleted_at)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Filter out accounts where user is the owner (already counted above) and non-deleted accounts
    const sharedCount = sharedAccounts?.filter(
      (au: any) => au.budget_accounts?.owner_id !== user.id && !au.budget_accounts?.deleted_at
    ).length || 0;

    const totalAccountsBefore = (ownedCountBefore || 0) + sharedCount;
    const isOnlyAccount = totalAccountsBefore === 1; // This is the only account if total is 1
    const remainingAccounts = totalAccountsBefore - 1; // After deletion

    // Soft delete the budget account by setting deleted_at
    const { error: deleteError } = await supabase
      .from('budget_accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('owner_id', user.id);

    if (deleteError) {
      console.error('Error deleting budget account:', deleteError);
      throw deleteError;
    }

    // Remove all account_users entries for this account
    // Use service role client to bypass RLS since owners can't delete their own entry via regular policies
    const serviceRoleSupabase = createServiceRoleClient();
    const { error: removeUsersError } = await serviceRoleSupabase
      .from('account_users')
      .delete()
      .eq('account_id', accountId);

    if (removeUsersError) {
      console.error('Error removing account users:', removeUsersError);
      // This is critical - if we can't remove account_users, the user won't be able to delete their account
      // Throw error to prevent inconsistent state
      throw removeUsersError;
    }

    // Clear the active account cookie if this was the active account
    const activeAccountId = await getActiveAccountId();
    if (activeAccountId === accountId) {
      // The cookie will be cleared by the client after redirect
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      isOnlyAccount,
      remainingAccounts: remainingAccounts,
    });
  } catch (error: any) {
    console.error('Error deleting budget account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
