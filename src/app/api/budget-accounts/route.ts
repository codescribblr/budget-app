import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserAccounts, getActiveAccountId, userHasOwnAccount } from '@/lib/account-context';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/budget-accounts
 * Get all budget accounts user belongs to
 */
export async function GET() {
  try {
    const accounts = await getUserAccounts();
    const activeAccountId = await getActiveAccountId();
    const hasOwnAccount = await userHasOwnAccount();
    const userIsAdmin = await isAdmin();

    return NextResponse.json({
      accounts,
      activeAccountId,
      hasOwnAccount,
      isAdmin: userIsAdmin,
    });
  } catch (error: any) {
    console.error('Error fetching budget accounts:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch budget accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget-accounts
 * Create a new budget account
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      );
    }

    // Create the account
    const { data: account, error: accountError } = await supabase
      .from('budget_accounts')
      .insert({
        owner_id: user.id,
        name: name.trim(),
      })
      .select('id, name, owner_id, created_at, updated_at')
      .single();

    if (accountError) throw accountError;

    // Add user as owner in account_users
    const { error: userError } = await supabase
      .from('account_users')
      .insert({
        account_id: account.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

    if (userError) throw userError;

    return NextResponse.json({ account }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating budget account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create budget account' },
      { status: 500 }
    );
  }
}


