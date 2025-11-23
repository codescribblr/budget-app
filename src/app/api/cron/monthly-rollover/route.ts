import { NextRequest, NextResponse } from 'next/server';
import { runScheduledJob, monthlyFundingRollover } from '@/lib/scheduled-jobs';

/**
 * GET /api/cron/monthly-rollover
 * Trigger monthly funding rollover job
 * 
 * This endpoint should be called by:
 * - Vercel Cron (configured in vercel.json)
 * - Supabase Edge Function with pg_cron
 * - External cron service
 * 
 * Security: In production, verify the request is from a trusted source
 * using Authorization header or Vercel Cron secret
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the job with automatic status tracking
    const result = await runScheduledJob(
      'monthly-funding-rollover',
      monthlyFundingRollover
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Monthly funding rollover completed',
        duration: result.duration,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Monthly funding rollover failed',
        error: result.error,
        duration: result.duration,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in monthly rollover cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

