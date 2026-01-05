import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { userHasAccountAccess } from '@/lib/account-context';
import { cookies } from 'next/headers';

/**
 * POST /api/budget-accounts/switch
 * Switch active budget account
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const body = await request.json();
    const { accountId } = body;

    if (!accountId || typeof accountId !== 'number') {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this account
    const hasAccess = await userHasAccountAccess(accountId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: User does not have access to this account' },
        { status: 403 }
      );
    }

    // Store active account in cookie
    const cookieStore = await cookies();
    cookieStore.set('active_account_id', accountId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return NextResponse.json({ success: true, accountId });
  } catch (error: any) {
    console.error('Error switching budget account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to switch budget account' },
      { status: 500 }
    );
  }
}










