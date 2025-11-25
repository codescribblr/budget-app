import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasOwnAccount } from '@/lib/account-context';

/**
 * POST /api/invitations/[token]/accept
 * Accept invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { token } = await params;

    // Find invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('account_invitations')
      .select('*, account:budget_accounts(id, name)')
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
    const { data: authUser } = await supabase.auth.getUser();
    if (invitation.email.toLowerCase() !== authUser.user?.email?.toLowerCase()) {
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

    // Add user to account_users
    const { error: memberError } = await supabase
      .from('account_users')
      .insert({
        account_id: invitation.account_id,
        user_id: user.id,
        role: invitation.role,
        status: 'active',
        invited_by: invitation.invited_by,
        accepted_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('account_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    const hasOwnAccount = await userHasOwnAccount();

    return NextResponse.json({
      success: true,
      account: invitation.account,
      userHasOwnAccount: hasOwnAccount,
    });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

