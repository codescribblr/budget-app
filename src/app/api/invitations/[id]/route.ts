import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId, userHasAccountWriteAccess } from '@/lib/account-context';

/**
 * DELETE /api/invitations/[id]
 * Cancel pending invitation (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { id } = await params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return NextResponse.json(
        { error: 'Invalid invitation ID' },
        { status: 400 }
      );
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account' },
        { status: 400 }
      );
    }

    // Verify user is account owner
    const hasWriteAccess = await userHasAccountWriteAccess(accountId);
    if (!hasWriteAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners can cancel invitations' },
        { status: 403 }
      );
    }

    // Verify invitation belongs to this account
    const { data: invitation, error: fetchError } = await supabase
      .from('account_invitations')
      .select('account_id')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.account_id !== accountId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete invitation
    const { error: deleteError } = await supabase
      .from('account_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) throw deleteError;

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

