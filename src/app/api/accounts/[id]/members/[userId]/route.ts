import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasAccountWriteAccess } from '@/lib/account-context';

/**
 * PATCH /api/accounts/[id]/members/[userId]
 * Update member permissions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { id, userId } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    // Verify user is account owner
    const hasWriteAccess = await userHasAccountWriteAccess(accountId);
    if (!hasWriteAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners can update permissions' },
        { status: 403 }
      );
    }

    // Check if user is account owner (cannot change owner role)
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (account?.owner_id === userId) {
      return NextResponse.json(
        { error: 'Cannot change owner permissions' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be "editor" or "viewer"' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('account_users')
      .update({ role })
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating member:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]/members/[userId]
 * Remove member from account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const { id, userId } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    // Cannot remove yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself. Use leave account instead.' },
        { status: 400 }
      );
    }

    // Verify user is account owner
    const hasWriteAccess = await userHasAccountWriteAccess(accountId);
    if (!hasWriteAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners can remove members' },
        { status: 403 }
      );
    }

    // Check if user is account owner (cannot remove owner)
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (account?.owner_id === userId) {
      return NextResponse.json(
        { error: 'Cannot remove account owner' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('account_users')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

