import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorization } from './cron-auth';
import { getPendingJobs, claimJob, renewJob, finishJob, expireJobLeases, failedJobCount } from './job-scheduler';
import { getJobHandler } from './job-handlers';
export async function runJobsRequest(request: NextRequest, onlyType?: string) {
  const auth = cronAuthorization(request.headers.get('authorization'));
  if (auth !== 200) return NextResponse.json({ success: false, error: auth === 401 ? 'Unauthorized' : 'Scheduled jobs are unavailable' }, { status: auth, headers: { 'Cache-Control': 'no-store' } });
  try {
    const expired = await expireJobLeases();
    const pending = (await getPendingJobs()).filter(job => !onlyType || job.job_type === onlyType);
    const results: { jobId: number; jobType: string; success: boolean }[] = [];
    const started = Date.now();
    for (const item of pending) {
      // Keep each trigger bounded; unclaimed jobs remain due for the next tick.
      if (Date.now() - started > 240_000) break;
      const job = await claimJob(item.id);
      if (!job) continue;
      let leaseLost = false, renewing = false;
      const heartbeat = setInterval(async () => {
        if (renewing) return;
        renewing = true;
        try { if (!await renewJob(job)) leaseLost = true; } catch { leaseLost = true; }
        finally { renewing = false; }
      }, 60_000);
      try {
        const handler = getJobHandler(job.job_type);
        if (!handler) throw Error('Unknown scheduled job type');
        const result = await handler();
        if (leaseLost) throw Error('Worker lease lost; review before retrying');
        await finishJob(job, result.success, result.message || result.error || 'Job finished');
        results.push({ jobId: job.id, jobType: job.job_type, success: result.success });
      } catch {
        // External effects may already have occurred. Never automatically rerun.
        await finishJob(job, false, 'Job failed or completion was uncertain. Review before rescheduling.').catch(() => {});
        results.push({ jobId: job.id, jobType: job.job_type, success: false });
      } finally { clearInterval(heartbeat); }
    }
    const failed = Math.max(await failedJobCount(), expired + results.filter(result => !result.success).length);
    return NextResponse.json({ success: failed === 0, processed: results.length, succeeded: results.filter(result => result.success).length, failed, expired, results }, { status: failed ? 500 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Scheduled job processing unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
