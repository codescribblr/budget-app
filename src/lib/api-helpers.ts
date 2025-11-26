import { NextResponse } from 'next/server';
import { getActiveAccountId, userHasAccountWriteAccess, getAccountById } from './account-context';
import { getAuthenticatedUser } from './supabase-queries';

/**
 * Check if user has write access to the active account
 * Returns a NextResponse with error if access is denied, or null if access is granted
 */
export async function checkWriteAccess(): Promise<NextResponse | null> {
  const accountId = await getActiveAccountId();
  if (!accountId) {
    return NextResponse.json(
      { error: 'No active account. Please select an account first.' },
      { status: 400 }
    );
  }

  const hasWriteAccess = await userHasAccountWriteAccess(accountId);
  if (!hasWriteAccess) {
    return NextResponse.json(
      { error: 'Unauthorized: You do not have permission to modify data. Viewers can only view data.' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if user is the owner of the active account
 * Returns a NextResponse with error if not owner, or null if owner
 */
export async function checkOwnerAccess(): Promise<NextResponse | null> {
  const { user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  
  if (!accountId) {
    return NextResponse.json(
      { error: 'No active account. Please select an account first.' },
      { status: 400 }
    );
  }

  const account = await getAccountById(accountId);
  if (!account) {
    return NextResponse.json(
      { error: 'Account not found' },
      { status: 404 }
    );
  }

  if (account.owner_id !== user.id) {
    return NextResponse.json(
      { error: 'Unauthorized: Only account owners can perform this action.' },
      { status: 403 }
    );
  }

  return null;
}
