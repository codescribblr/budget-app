import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasAccountAccess } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/budget-accounts/[id]/members
 * Get all members of a budget account
 */
export async function GET(
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

    // Verify user has access to this account
    const hasAccess = await userHasAccountAccess(accountId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get account owner
    const { data: account, error: accountError } = await supabase
      .from('budget_accounts')
      .select('owner_id, created_at')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Get all members
    const { data: members, error } = await supabase
      .from('account_users')
      .select('user_id, role, status, accepted_at, created_at')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Collect all user IDs (including owner)
    const userIds = new Set<string>();
    if (account?.owner_id) {
      userIds.add(account.owner_id);
    }
    (members || []).forEach((member: any) => {
      userIds.add(member.user_id);
    });

    // Fetch user emails using Auth Admin API (requires service role client)
    const adminSupabase = createServiceRoleClient();
    const userEmailMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
        if (userError) {
          console.error(`Error fetching user ${userId}:`, userError);
          continue;
        }
        if (userData?.user?.email) {
          userEmailMap.set(userId, userData.user.email);
        } else {
          console.warn(`No email found for user ${userId}`);
        }
      } catch (err) {
        console.error(`Exception fetching user ${userId}:`, err);
      }
    }

    // Format members
    const formattedMembers = (members || []).map((member: any) => ({
      userId: member.user_id,
      email: userEmailMap.get(member.user_id) || 'Unknown',
      role: member.role,
      isOwner: account?.owner_id === member.user_id,
      joinedAt: member.accepted_at || member.created_at,
    }));

    // Add owner if not in members list
    if (account?.owner_id) {
      const ownerInList = formattedMembers.find(m => m.userId === account.owner_id);
      if (!ownerInList) {
        formattedMembers.unshift({
          userId: account.owner_id,
          email: userEmailMap.get(account.owner_id) || 'Unknown',
          role: 'owner',
          isOwner: true,
          joinedAt: account.created_at,
        });
      }
    }

    return NextResponse.json({ members: formattedMembers });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}


