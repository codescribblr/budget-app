import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/invitations/my-invitations
 * Get pending invitations sent to the current user's email address
 * This is for users who don't have an account yet or want to see invitations sent to them
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    if (!user.email) {
      return NextResponse.json({ invitations: [] });
    }

    // Fetch invitations without account join (RLS might block it)
    const { data: invitations, error } = await supabase
      .from('account_invitations')
      .select('id, account_id, email, role, token, invited_by, expires_at, created_at')
      .eq('email', user.email.toLowerCase())
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch account details for each invitation using service role to bypass RLS
    const adminSupabase = createServiceRoleClient();
    const invitationsWithAccounts = await Promise.all(
      (invitations || []).map(async (invitation) => {
        const { data: account } = await adminSupabase
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
            // Ignore error, use fallback
          }
        }

        return {
          ...invitation,
          account: {
            id: invitation.account_id,
            name: accountName,
          },
        };
      })
    );

    return NextResponse.json({ invitations: invitationsWithAccounts });
  } catch (error: any) {
    console.error('Error fetching user invitations:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

