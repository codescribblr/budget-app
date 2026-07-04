import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import {
  cleanupDuplicateEmptyAccounts,
  userHasOwnAccount,
} from '@/lib/account-context';

/**
 * POST /api/budget-accounts/cleanup-duplicates
 * Soft-delete duplicate empty budget accounts and restore the primary account.
 */
export async function POST() {
  try {
    await getAuthenticatedUser();

    if (!(await userHasOwnAccount())) {
      return NextResponse.json(
        { error: 'Only account owners can clean up duplicate accounts' },
        { status: 403 }
      );
    }

    const result = await cleanupDuplicateEmptyAccounts();

    if (!result.cleaned) {
      return NextResponse.json({
        success: true,
        message: result.keptAccountId
          ? 'No empty duplicate accounts found to delete. Active account reset to primary.'
          : 'No duplicate accounts to clean up',
        keptAccountId: result.keptAccountId,
        deletedAccountIds: [],
        switchedToPrimary: !!result.keptAccountId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${result.deletedAccountIds.length} duplicate empty account${result.deletedAccountIds.length !== 1 ? 's' : ''} and restored your primary account.`,
      keptAccountId: result.keptAccountId,
      deletedAccountIds: result.deletedAccountIds,
      switchedToPrimary: true,
    });
  } catch (error: any) {
    console.error('Error cleaning up duplicate budget accounts:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to clean up duplicate accounts' },
      { status: 500 }
    );
  }
}
