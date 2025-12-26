import { createClient } from './supabase/server';

/**
 * Job status types (mapped to new schema)
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
 * Map old job status to new schema status
 */
function mapStatusToNewSchema(status: JobStatus): 'pending' | 'running' | 'completed' | 'failed' {
  switch (status) {
    case 'success':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'running':
      return 'running';
    default:
      return 'pending';
  }
}

/**
 * Update the status of a scheduled job
 * Updated to work with new schema (job_type, status, started_at, completed_at, error_message)
 */
export async function updateJobStatus(
  jobName: string,
  status: JobStatus,
  duration?: number,
  error?: string
): Promise<void> {
  const supabase = await createClient();

  // Map job_name to job_type (they're the same concept)
  const jobType = jobName;
  const newStatus = mapStatusToNewSchema(status);
  const now = new Date().toISOString();

  // Find existing job by job_type
  const { data: existingJob } = await supabase
    .from('scheduled_jobs')
    .select('id, started_at, completed_at, metadata')
    .eq('job_type', jobType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const updateData: any = {
    status: newStatus,
    updated_at: now,
  };

  // Set started_at if starting, completed_at if finishing
  if (status === 'running') {
    updateData.started_at = now;
  } else if (status === 'success' || status === 'failed') {
    if (!existingJob?.started_at) {
      updateData.started_at = now; // Set started_at if not already set
    }
    updateData.completed_at = now;
  }

  if (error) {
    updateData.error_message = error;
  }

  // Store duration in metadata
  if (duration !== undefined) {
    const existingMetadata = (existingJob?.metadata as Record<string, any>) || {};
    updateData.metadata = {
      ...existingMetadata,
      last_run_duration_ms: duration,
    };
  }

  // Upsert the job record (create if doesn't exist, update if it does)
  if (existingJob) {
    // Update existing job
    await supabase
      .from('scheduled_jobs')
      .update(updateData)
      .eq('id', existingJob.id);
  } else {
    // Create new job record
    await supabase
      .from('scheduled_jobs')
      .insert({
        job_type: jobType,
        status: newStatus,
        scheduled_for: now, // Use current time as scheduled_for for tracking jobs
        ...updateData,
      });
  }
}

/**
 * Get the status of a scheduled job
 * Updated to work with new schema
 */
export async function getJobStatus(jobName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select('*')
    .eq('job_type', jobName) // Use job_type instead of job_name
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  
  // Transform to old format for backward compatibility
  if (data) {
    return {
      ...data,
      job_name: data.job_type, // Map job_type back to job_name for compatibility
      last_run_at: data.started_at || data.completed_at,
      last_run_status: data.status === 'completed' ? 'success' : data.status === 'failed' ? 'failed' : data.status === 'running' ? 'running' : null,
      last_run_duration_ms: data.metadata?.last_run_duration_ms,
      last_error: data.error_message,
      next_run_at: data.scheduled_for,
      run_count: 0, // Not tracked in new schema
      failure_count: 0, // Not tracked in new schema
    };
  }
  
  return null;
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
 * Updated to work with new schema and provide backward compatibility
 */
export async function getAllScheduledJobs() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select('*')
    .order('job_type'); // Use job_type instead of job_name

  if (error) throw error;
  
  // Transform to old format for backward compatibility
  return (data || []).map(job => ({
    ...job,
    job_name: job.job_type, // Map job_type back to job_name
    last_run_at: job.started_at || job.completed_at,
    last_run_status: job.status === 'completed' ? 'success' : job.status === 'failed' ? 'failed' : job.status === 'running' ? 'running' : null,
    last_run_duration_ms: job.metadata?.last_run_duration_ms,
    last_error: job.error_message,
    next_run_at: job.scheduled_for,
    run_count: 0, // Not tracked in new schema
    failure_count: 0, // Not tracked in new schema
  }));
}

