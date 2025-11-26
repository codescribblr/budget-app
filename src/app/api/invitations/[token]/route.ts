import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/invitations/[token]
 * Get invitation details (for display before accepting)
 * 
 * DELETE /api/invitations/[token]
 * Cancel pending invitation (owner only) - token can be invitation ID or token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { token } = await params;

    // Find invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('account_invitations')
      .select('id, account_id, email, role, token, expires_at')
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if email matches
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invitation email does not match your account email' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('account_users')
      .select('id')
      .eq('account_id', invitation.account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this account' },
        { status: 400 }
      );
    }

    // Fetch account details using service role to bypass RLS
    // (user doesn't have access yet since they haven't accepted)
    const adminSupabase = createServiceRoleClient();
    const { data: account, error: accountError } = await adminSupabase
      .from('budget_accounts')
      .select('id, name, owner_id')
      .eq('id', invitation.account_id)
      .single();

    // Get owner email as fallback for account name
    let accountName = account?.name || 'Unknown Account';
    if (!account?.name && account?.owner_id) {
      try {
        const { data: owner } = await adminSupabase.auth.admin.getUserById(account.owner_id);
        accountName = owner?.user?.email || accountName;
      } catch (err) {
        console.error('Error fetching owner email:', err);
      }
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const hasOwnAccount = authUser ? await checkUserHasOwnAccount(supabase, authUser.id) : false;

    return NextResponse.json({
      account: {
        id: invitation.account_id,
        name: accountName,
      },
      role: invitation.role,
      userHasOwnAccount: hasOwnAccount,
    });
  } catch (error: any) {
    console.error('Error fetching invitation:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

async function checkUserHasOwnAccount(supabase: any, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('budget_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .is('deleted_at', null);
  
  return (count || 0) > 0;
}

/**
 * DELETE /api/invitations/[token]
 * Cancel pending invitation (owner only)
 * The token parameter can be either an invitation ID (number) or token (UUID)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { token } = await params;
    
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account' },
        { status: 400 }
      );
    }

    // Verify user is account owner
    const { userHasAccountWriteAccess } = await import('@/lib/account-context');
    const hasWriteAccess = await userHasAccountWriteAccess(accountId);
    if (!hasWriteAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners can cancel invitations' },
        { status: 403 }
      );
    }

    // Try to parse as ID first, otherwise treat as token
    const invitationId = parseInt(token);
    let invitation;
    
    if (!isNaN(invitationId)) {
      // It's an ID
      const { data, error: fetchError } = await supabase
        .from('account_invitations')
        .select('account_id')
        .eq('id', invitationId)
        .single();
      
      if (fetchError || !data) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        );
      }
      invitation = data;
    } else {
      // It's a token
      const { data, error: fetchError } = await supabase
        .from('account_invitations')
        .select('account_id')
        .eq('token', token)
        .single();
      
      if (fetchError || !data) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        );
      }
      invitation = data;
    }

    if (invitation.account_id !== accountId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete invitation
    const deleteQuery = !isNaN(invitationId) 
      ? supabase.from('account_invitations').delete().eq('id', invitationId).eq('account_id', accountId)
      : supabase.from('account_invitations').delete().eq('token', token).eq('account_id', accountId);
    
    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    // Note: Supabase DELETE doesn't always return deleted rows in the response,
    // especially with RLS policies. If there's no error, the deletion succeeded.
    // Verify by checking if the invitation still exists
    const verifyQuery = !isNaN(invitationId)
      ? supabase.from('account_invitations').select('id').eq('id', invitationId).single()
      : supabase.from('account_invitations').select('id').eq('token', token).single();
    
    const { data: verifyData } = await verifyQuery;
    
    // If we can still find it, deletion failed
    if (verifyData) {
      return NextResponse.json(
        { error: 'Failed to delete invitation. It may have already been deleted or you may not have permission.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}

