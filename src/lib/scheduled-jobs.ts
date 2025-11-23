import { createClient } from './supabase/server';

/**
 * Job status types
 */
export type JobStatus = 'success' | 'failed' | 'running';

/**
 * Job execution result
 */
export interface JobResult {
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Update the status of a scheduled job
 */
export async function updateJobStatus(
  jobName: string,
  status: JobStatus,
  duration?: number,
  error?: string
): Promise<void> {
  const supabase = await createClient();

  const updateData: any = {
    last_run_at: new Date().toISOString(),
    last_run_status: status,
    updated_at: new Date().toISOString(),
  };

  if (duration !== undefined) {
    updateData.last_run_duration_ms = duration;
  }

  if (error) {
    updateData.last_error = error;
  }

  // Increment counters
  if (status === 'success' || status === 'failed') {
    const { data: currentJob } = await supabase
      .from('scheduled_jobs')
      .select('run_count, failure_count')
      .eq('job_name', jobName)
      .single();

    if (currentJob) {
      updateData.run_count = currentJob.run_count + 1;
      if (status === 'failed') {
        updateData.failure_count = currentJob.failure_count + 1;
      }
    }
  }

  // Upsert the job record
  await supabase
    .from('scheduled_jobs')
    .upsert({
      job_name: jobName,
      ...updateData,
    }, {
      onConflict: 'job_name',
    });
}

/**
 * Get the status of a scheduled job
 */
export async function getJobStatus(jobName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select('*')
    .eq('job_name', jobName)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Wrapper function to run a scheduled job with automatic status tracking
 */
export async function runScheduledJob(
  jobName: string,
  jobFunction: () => Promise<void>
): Promise<JobResult> {
  const startTime = Date.now();

  try {
    // Mark job as running
    await updateJobStatus(jobName, 'running');

    // Execute the job
    await jobFunction();

    // Mark job as successful
    const duration = Date.now() - startTime;
    await updateJobStatus(jobName, 'success', duration);

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    // Mark job as failed
    const duration = Date.now() - startTime;
    const errorMessage = error.message || 'Unknown error';
    await updateJobStatus(jobName, 'failed', duration, errorMessage);

    console.error(`Scheduled job '${jobName}' failed:`, error);

    return {
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Monthly funding rollover job
 * Resets monthly funding tracking for the new month
 */
export async function monthlyFundingRollover(): Promise<void> {
  const supabase = await createClient();

  // This job doesn't need to do anything currently
  // Monthly funding records are created on-demand when allocations are made
  // Old records are kept for historical tracking
  
  // In the future, we could:
  // - Archive old funding records
  // - Send notifications about underfunded categories
  // - Generate monthly reports
  
  console.log('Monthly funding rollover completed');
}

/**
 * Get all scheduled jobs (admin only)
 */
export async function getAllScheduledJobs() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select('*')
    .order('job_name');

  if (error) throw error;
  return data || [];
}

