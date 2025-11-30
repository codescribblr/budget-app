import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';

/**
 * POST /api/auth/signup-with-invite
 * Sign up a new user via invite link (bypasses email verification)
 * This is used when a user signs up from an invite link - since they've already
 * verified their email by clicking the invite link, we can bypass Supabase's email verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, inviteToken } = body;

    if (!email || !password || !inviteToken) {
      return NextResponse.json(
        { error: 'Email, password, and invite token are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Verify the invite token exists and is valid
    const adminSupabase = createServiceRoleClient();
    const { data: invitation, error: inviteError } = await adminSupabase
      .from('account_invitations')
      .select('id, account_id, email, role, token, expires_at')
      .eq('token', inviteToken)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Verify email matches invitation
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser;
    try {
      const { data: users } = await adminSupabase.auth.admin.listUsers();
      existingUser = users.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
    } catch (err) {
      console.error('Error checking existing users:', err);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Create user using Admin API with email_confirm: true to bypass verification
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Bypass email verification since they clicked invite link
      user_metadata: {
        signup_source: 'invite',
      },
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // User created successfully with email confirmed
    // Client will sign them in using signInWithPassword
    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      email: newUser.user.email,
    });
  } catch (error: any) {
    console.error('Error in signup-with-invite:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

