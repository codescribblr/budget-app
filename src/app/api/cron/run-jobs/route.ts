import { NextRequest, NextResponse } from 'next/server';
import { getPendingJobs, markJobRunning, markJobCompleted, markJobFailed, scheduleNextRun } from '@/lib/scheduled-jobs/job-scheduler';
import { getJobHandler } from '@/lib/scheduled-jobs/job-handlers';

/**
 * GET /api/cron/run-jobs
 * Single cron endpoint that processes all pending scheduled jobs
 * 
 * This is the ONLY cron job endpoint that should be called by Vercel Cron.
 * It checks the scheduled_jobs table for pending jobs and executes them.
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

    // Get pending jobs that are due to run
    const pendingJobs = await getPendingJobs();

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending jobs to process',
        processed: 0,
      });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each pending job
    for (const job of pendingJobs) {
      try {
        // Mark job as running
        await markJobRunning(job.id);

        // Get handler for this job type
        const handler = getJobHandler(job.job_type);

        if (!handler) {
          await markJobFailed(job.id, `Unknown job type: ${job.job_type}`);
          results.push({
            jobId: job.id,
            jobType: job.job_type,
            success: false,
            error: `Unknown job type: ${job.job_type}`,
          });
          failureCount++;
          continue;
        }

        // Execute the job handler
        const result = await handler();

        if (result.success) {
          await markJobCompleted(job.id, result.message, job.metadata);
          
          // Schedule next run for recurring jobs
          await scheduleNextRun(job.job_type, job.metadata);
          
          results.push({
            jobId: job.id,
            jobType: job.job_type,
            success: true,
            message: result.message,
          });
          successCount++;
        } else {
          await markJobFailed(job.id, result.error || 'Job failed');
          results.push({
            jobId: job.id,
            jobType: job.job_type,
            success: false,
            error: result.error,
          });
          failureCount++;
        }
      } catch (error: any) {
        // Mark job as failed
        await markJobFailed(job.id, error.message || 'Unexpected error');
        results.push({
          jobId: job.id,
          jobType: job.job_type,
          success: false,
          error: error.message || 'Unexpected error',
        });
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingJobs.length} jobs: ${successCount} succeeded, ${failureCount} failed`,
      processed: pendingJobs.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in run-jobs cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

