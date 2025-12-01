import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserAccountCount } from '@/lib/account-context';

/**
 * DELETE /api/budget-accounts/[id]/leave
 * Leave budget account (non-owners)
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

    // Check if user is account owner
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (account?.owner_id === user.id) {
      return NextResponse.json(
        { error: 'Account owners cannot leave their own account' },
        { status: 400 }
      );
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from('account_users')
      .select('id')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You are not a member of this account' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { createOwnAccount, deleteUserAccount } = body;

    // Get current account count
    const currentCount = await getUserAccountCount();

    // If this is the only account and user wants to delete account
    if (currentCount === 1 && deleteUserAccount) {
      // Remove from account first
      await supabase
        .from('account_users')
        .delete()
        .eq('account_id', accountId)
        .eq('user_id', user.id);

      // Delete user account (this will be handled by delete-account endpoint)
      return NextResponse.json({
        success: true,
        message: 'Left account. User account deletion required.',
        remainingAccounts: 0,
        requiresAccountDeletion: true,
      });
    }

    // If this is the only account and user wants to create own account
    if (currentCount === 1 && createOwnAccount) {
      // Create new account
      const { data: newAccount, error: createError } = await supabase
        .from('budget_accounts')
        .insert({
          owner_id: user.id,
          name: 'My Budget',
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Add user as owner
      await supabase
        .from('account_users')
        .insert({
          account_id: newAccount.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          accepted_at: new Date().toISOString(),
        });

      // Remove from old account
      await supabase
        .from('account_users')
        .delete()
        .eq('account_id', accountId)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        message: 'Left account and created your own account',
        createdAccount: true,
        newAccountId: newAccount.id,
        remainingAccounts: 1,
      });
    }

    // Normal leave (user has other accounts)
    if (currentCount > 1) {
      await supabase
        .from('account_users')
        .delete()
        .eq('account_id', accountId)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        message: 'Left account successfully',
        remainingAccounts: currentCount - 1,
      });
    }

    // If this is the only account and no action specified
    return NextResponse.json(
      {
        error: 'This is your only account. You must either create your own account or delete your user account.',
        requiresAction: true,
        remainingAccounts: 1,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error leaving budget account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to leave budget account' },
      { status: 500 }
    );
  }
}





