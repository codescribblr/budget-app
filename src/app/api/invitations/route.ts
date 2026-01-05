import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId, userHasAccountWriteAccess } from '@/lib/account-context';
import { sendInvitationEmail } from '@/lib/email-utils';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

/**
 * GET /api/invitations
 * Get pending invitations for the current active account
 * Only account owners can view invitations for their account
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
      .select('id, email, role, token, invited_by, expires_at, created_at')
      .eq('account_id', accountId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out invitations for users who are already members
    const adminSupabase = createServiceRoleClient();
    const filteredInvitations = [];
    
    for (const invitation of (invitations || [])) {
      let isMember = false;
      
      try {
        // Find user by email
        const { data: users } = await adminSupabase.auth.admin.listUsers();
        const targetUser = users?.users?.find(
          (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
        );
        
        if (targetUser) {
          // Check if user is owner
          const { data: account } = await adminSupabase
            .from('budget_accounts')
            .select('owner_id')
            .eq('id', accountId)
            .single();
          
          if (account?.owner_id === targetUser.id) {
            isMember = true;
          } else {
            // Check if user is in account_users
            const { data: member } = await adminSupabase
              .from('account_users')
              .select('id')
              .eq('account_id', accountId)
              .eq('user_id', targetUser.id)
              .eq('status', 'active')
              .single();
            
            if (member) {
              isMember = true;
              // Mark invitation as accepted since user is already a member
              await supabase
                .from('account_invitations')
                .update({ accepted_at: new Date().toISOString() })
                .eq('id', invitation.id);
            }
          }
        }
      } catch (err) {
        // If check fails, include invitation (better to show than hide)
        console.error(`Error checking membership for invitation ${invitation.id}:`, err);
      }
      
      if (!isMember) {
        filteredInvitations.push(invitation);
      }
    }

    return NextResponse.json({ invitations: filteredInvitations });
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

    // Check if user is already a member by looking up user by email
    // Use service role client to check all users
    const adminSupabase = createServiceRoleClient();
    let userAlreadyMember = false;
    
    try {
      // Find user by email
      const { data: users } = await adminSupabase.auth.admin.listUsers();
      const targetUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      
      if (targetUser) {
        // Check if user is already a member (either as owner or in account_users)
        const { data: account } = await adminSupabase
          .from('budget_accounts')
          .select('owner_id')
          .eq('id', accountId)
          .single();
        
        if (account?.owner_id === targetUser.id) {
          userAlreadyMember = true;
        } else {
          const { data: member } = await adminSupabase
            .from('account_users')
            .select('id')
            .eq('account_id', accountId)
            .eq('user_id', targetUser.id)
            .eq('status', 'active')
            .single();
          
          if (member) {
            userAlreadyMember = true;
          }
        }
      }
    } catch (err) {
      // If we can't check, continue - we'll catch it when they try to accept
      console.error('Error checking if user is already a member:', err);
    }

    if (userAlreadyMember) {
      return NextResponse.json(
        { error: 'This user is already a member of this account' },
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

    // Get account name
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('name')
      .eq('id', accountId)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
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

    // Send invitation email
    try {
      await sendInvitationEmail(
        email.toLowerCase(),
        token,
        account.name,
        user.user_metadata?.name || user.email?.split('@')[0] || 'Someone',
        user.email || '',
        role
      );
    } catch (emailError: any) {
      // Log error but don't fail the invitation creation
      console.error('Error sending invitation email:', emailError);
      // In production, you might want to queue this for retry
    }

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


