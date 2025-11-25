import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * GET /api/invitations/[token]
 * Get invitation details (for display before accepting)
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

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const hasOwnAccount = authUser ? await checkUserHasOwnAccount(supabase, authUser.id) : false;

    return NextResponse.json({
      account: invitation.account,
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

