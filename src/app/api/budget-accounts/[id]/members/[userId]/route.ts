import { rowPrecondition, staleRowResponse, optionalDeleteBody } from "@/lib/row-precondition";
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasAccountAccess, getActiveAccountId } from '@/lib/account-context';

/**
 * PATCH /api/budget-accounts/[id]/members/[userId]
 * Update a member's role in a budget account
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
    const hasAccess = await userHasAccountAccess(accountId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if user is actually the owner
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (account?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only account owners can update member roles' },
        { status: 403 }
      );
    }

    // Prevent changing owner's role
    if (userId === account.owner_id) {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;
    const guard=rowPrecondition(body,await getActiveAccountId());
    if(guard.response)return guard.response;

    if (!role || !['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be editor or viewer' },
        { status: 400 }
      );
    }

    // Update member role
    let query=supabase.from('account_users').update({role,updated_at:new Date().toISOString()}).eq('account_id',accountId).eq('user_id',userId).eq('status','active');
    if(guard.revision)query=query.eq('revision',guard.revision);
    const {data:saved,error:updateError}=await query.select('id');
    if(!updateError && !saved?.length && guard.revision)return staleRowResponse();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating member role:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget-accounts/[id]/members/[userId]
 * Remove a member from a budget account
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

    // Verify user is account owner
    const hasAccess = await userHasAccountAccess(accountId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if user is actually the owner
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (account?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only account owners can remove members' },
        { status: 403 }
      );
    }

    // Prevent removing owner
    if (userId === account.owner_id) {
      return NextResponse.json(
        { error: 'Cannot remove account owner' },
        { status: 400 }
      );
    }

    // Remove member
    const guard=rowPrecondition(await optionalDeleteBody(request),await getActiveAccountId());
    if(guard.response)return guard.response;
    let query=supabase.from('account_users').delete().eq('account_id',accountId).eq('user_id',userId);
    if(guard.revision)query=query.eq('revision',guard.revision);
    const {data:removed,error:deleteError}=await query.select('id');
    if(!deleteError && !removed?.length && guard.revision)return staleRowResponse();

    if (deleteError) throw deleteError;

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










