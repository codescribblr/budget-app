import { NextRequest, NextResponse } from 'next/server';
import { handleCheckRecurringTransactions } from '@/lib/scheduled-jobs/job-handlers';

/**
 * GET /api/cron/check-recurring-transactions
 * Legacy cron endpoint — runs the same handler as check_recurring_transactions scheduled job.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await handleCheckRecurringTransactions();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error,
    }, { status: 500 });
  } catch (error: any) {
    console.error('Error in check recurring transactions cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
