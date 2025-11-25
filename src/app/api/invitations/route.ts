import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId, userHasAccountWriteAccess } from '@/lib/account-context';
import { randomUUID } from 'crypto';

/**
 * GET /api/invitations
 * Get pending invitations for current account
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
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
        { error: 'Unauthorized: Only account owners can view invitations' },
        { status: 403 }
      );
    }

    const { data: invitations, error } = await supabase
      .from('account_invitations')
      .select(`
        id,
        email,
        role,
        token,
        invited_by,
        expires_at,
        created_at,
        inviter:auth.users!account_invitations_invited_by_fkey(email)
      `)
      .eq('account_id', accountId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ invitations: invitations || [] });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations
 * Send invitation to join account
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
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
        { error: 'Unauthorized: Only account owners can send invitations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!role || !['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be "editor" or "viewer"' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('account_users')
      .select('id')
      .eq('account_id', accountId)
      .eq('user_id', (await supabase.auth.admin.getUserByEmail(email)).data.user?.id || '')
      .eq('status', 'active')
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this account' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('account_invitations')
      .select('id')
      .eq('account_id', accountId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      );
    }

    // Create invitation
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const { data: invitation, error } = await supabase
      .from('account_invitations')
      .insert({
        account_id: accountId,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, email, role, expires_at, created_at')
      .single();

    if (error) throw error;

    // TODO: Send invitation email

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

