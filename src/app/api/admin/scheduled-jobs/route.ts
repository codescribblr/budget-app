import { NextResponse } from 'next/server';
import { getAllScheduledJobs } from '@/lib/scheduled-jobs';

/**
 * GET /api/admin/scheduled-jobs
 * List all scheduled jobs with their status
 * Note: Currently accessible to all authenticated users
 * In production, add admin role check
 */
export async function GET() {
  try {
    const jobs = await getAllScheduledJobs();

    // Calculate health metrics
    const healthMetrics = {
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.last_run_status === 'running').length,
      failedJobs: jobs.filter(j => j.last_run_status === 'failed').length,
      successfulJobs: jobs.filter(j => j.last_run_status === 'success').length,
      neverRun: jobs.filter(j => !j.last_run_at).length,
    };

    return NextResponse.json({
      jobs,
      metrics: healthMetrics,
    });
  } catch (error: any) {
    console.error('Error fetching scheduled jobs:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch scheduled jobs' },
      { status: 500 }
    );
  }
}

