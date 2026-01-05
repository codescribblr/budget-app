import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasOwnAccount } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

    // Find invitation (don't join account yet - RLS might block it)
    const { data: invitation, error: inviteError } = await supabase
      .from('account_invitations')
      .select('id, account_id, email, role, token, expires_at, invited_by')
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

    // Fetch account details using service role to bypass RLS
    // (user doesn't have access yet, so RLS would block the query)
    const adminSupabase = createServiceRoleClient();
    const { data: account, error: accountError } = await adminSupabase
      .from('budget_accounts')
      .select('id, name, owner_id')
      .eq('id', invitation.account_id)
      .single();

    if (accountError) {
      console.error('Error fetching account:', accountError);
      throw accountError;
    }

    // Get owner email as fallback for account name and to display owner info
    let accountName = account?.name || 'Unknown Account';
    let ownerEmail = null;
    if (account?.owner_id) {
      try {
        const { data: owner } = await adminSupabase.auth.admin.getUserById(account.owner_id);
        if (owner?.user?.email) {
          ownerEmail = owner.user.email;
          // Use owner email as fallback for account name if account name is not set
          if (!account?.name) {
            accountName = ownerEmail;
          }
        }
      } catch (err) {
        console.error('Error fetching owner email:', err);
      }
    }

    // Add user to account_users using service role to bypass RLS
    // (user doesn't have access yet, so RLS would block the insert)
    const { error: memberError } = await adminSupabase
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

    // Mark ALL invitations for this email/account as accepted
    // (in case there were multiple invitations sent)
    const { error: updateError } = await adminSupabase
      .from('account_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('account_id', invitation.account_id)
      .eq('email', invitation.email.toLowerCase())
      .is('accepted_at', null);

    if (updateError) throw updateError;

    const hasOwnAccount = await userHasOwnAccount();

    return NextResponse.json({
      success: true,
      account: {
        id: invitation.account_id,
        name: accountName,
        ownerEmail: ownerEmail,
      },
      role: invitation.role,
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


