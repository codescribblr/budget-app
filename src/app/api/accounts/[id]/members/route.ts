import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasAccountAccess } from '@/lib/account-context';

/**
 * GET /api/accounts/[id]/members
 * Get all members of an account
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
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    // Get all members
    const { data: members, error } = await supabase
      .from('account_users')
      .select(`
        user_id,
        role,
        status,
        accepted_at,
        created_at,
        user:auth.users!account_users_user_id_fkey(email)
      `)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Format members
    const formattedMembers = (members || []).map((member: any) => ({
      userId: member.user_id,
      email: member.user?.email || 'Unknown',
      role: member.role,
      isOwner: account?.owner_id === member.user_id,
      joinedAt: member.accepted_at || member.created_at,
    }));

    // Add owner if not in members list
    if (account?.owner_id) {
      const ownerInList = formattedMembers.find(m => m.userId === account.owner_id);
      if (!ownerInList) {
        const { data: ownerData } = await supabase.auth.admin.getUserById(account.owner_id);
        formattedMembers.unshift({
          userId: account.owner_id,
          email: ownerData?.user?.email || 'Unknown',
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

