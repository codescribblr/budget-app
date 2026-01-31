import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { detectRecurringTransactions } from '@/lib/recurring-transactions/detection';
import { saveDetectedPatterns } from '@/lib/recurring-transactions/save-patterns';

/**
 * POST /api/recurring-transactions/detect
 * Run detection algorithm to find recurring transactions and save them
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const lookbackMonths = body.lookbackMonths || 24;

    // Detect patterns
    console.log(`[Detect API] Starting detection for user ${user.id}, account ${accountId}, lookback ${lookbackMonths} months`);
    const patterns = await detectRecurringTransactions(user.id, accountId, lookbackMonths);
    console.log(`[Detect API] Found ${patterns.length} patterns`);

    if (patterns.length === 0) {
      return NextResponse.json({ 
        patterns: [],
        saved: 0,
        skipped: 0,
        errors: 0,
        message: 'No recurring patterns found'
      });
    }

    // Save detected patterns (checks for duplicates)
    const result = await saveDetectedPatterns(user.id, accountId, patterns);

    return NextResponse.json({ 
      patterns,
      ...result,
      message: `Found ${patterns.length} patterns. ${result.saved} saved, ${result.skipped} already existed, ${result.errors} errors`
    });
  } catch (error: any) {
    console.error('Error detecting recurring transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to detect recurring transactions' },
      { status: 500 }
    );
  }
}




