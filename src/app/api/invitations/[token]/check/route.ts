import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/invitations/[token]/check
 * Public endpoint to check invitation validity and if user exists
 * Used to determine whether to redirect to signup or login
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createServiceRoleClient();

    // Find invitation (don't join account - RLS might block it)
    const { data: invitation, error: inviteError } = await supabase
      .from('account_invitations')
      .select('id, account_id, email, expires_at')
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted', exists: false },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired', exists: false },
        { status: 400 }
      );
    }

    // Fetch account details using service role to bypass RLS
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('id, name, owner_id')
      .eq('id', invitation.account_id)
      .single();

    // Get owner email as fallback for account name
    let accountName = account?.name || 'Unknown Account';
    if (!account?.name && account?.owner_id) {
      try {
        const { data: owner } = await supabase.auth.admin.getUserById(account.owner_id);
        accountName = owner?.user?.email || accountName;
      } catch (err) {
        // Ignore error, use fallback
      }
    }

    // Check if user exists by email using auth admin API
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        // If we can't check, assume user doesn't exist (safer to redirect to signup)
        return NextResponse.json({
          valid: true,
          email: invitation.email,
          account: {
            id: invitation.account_id,
            name: accountName,
          },
          userExists: false,
        });
      }

      const userExists = users?.users?.some(
        (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
      ) || false;

      return NextResponse.json({
        valid: true,
        email: invitation.email,
        account: {
          id: invitation.account_id,
          name: accountName,
        },
        userExists,
      });
    } catch (err) {
      console.error('Exception checking user existence:', err);
      // If we can't check, assume user doesn't exist (safer to redirect to signup)
      return NextResponse.json({
        valid: true,
        email: invitation.email,
        account: {
          id: invitation.account_id,
          name: accountName,
        },
        userExists: false,
      });
    }
  } catch (error: any) {
    console.error('Error checking invitation:', error);
    return NextResponse.json(
      { error: 'Failed to check invitation', exists: false },
      { status: 500 }
    );
  }
}

