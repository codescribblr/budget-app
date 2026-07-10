/**
 * Job scheduler - manages scheduled jobs in the database
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

export interface ScheduledJob {
  id: number;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Schedule a job to run at a specific time.
 * If a row with this job_type already exists (e.g. unique constraint), update it to pending instead of inserting.
 */
export async function scheduleJob(
  jobType: string,
  scheduledFor: Date,
  metadata?: Record<string, any>
): Promise<number> {
  const supabase = createServiceRoleClient();
  const payload = {
    status: 'pending',
    scheduled_for: scheduledFor.toISOString(),
    started_at: null,
    completed_at: null,
    error_message: null,
    metadata: metadata || {},
  };

  const { data: updated, error: updateError } = await supabase
    .from('scheduled_jobs')
    .update(payload)
    .eq('job_type', jobType)
    .select('id')
    .maybeSingle();

  if (!updateError && updated) {
    return updated.id;
  }

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .insert({
      job_type: jobType,
      status: 'pending',
      scheduled_for: scheduledFor.toISOString(),
      metadata: metadata || {},
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to schedule job: ${error.message}`);
  }

  return data.id;
}

/**
 * Get pending jobs that are due to run
 */
export async function getPendingJobs(): Promise<ScheduledJob[]> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true });

  if (error) {
    throw new Error(`Failed to get pending jobs: ${error.message}`);
  }

  return data || [];
}

/**
 * Mark a job as running
 */
export async function markJobRunning(jobId: number): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('scheduled_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as running: ${error.message}`);
  }
}

/**
 * Mark a job as completed
 */
export async function markJobCompleted(jobId: number, message?: string, existingMetadata?: Record<string, any>): Promise<void> {
  const supabase = createServiceRoleClient();

  const updateData: any = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  };

  // Preserve existing metadata and add message if provided
  if (existingMetadata || message) {
    updateData.metadata = {
      ...existingMetadata,
      ...(message && { lastMessage: message }),
    };
  }

  const { error } = await supabase
    .from('scheduled_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as completed: ${error.message}`);
  }
}

/**
 * Mark a job as failed
 */
export async function markJobFailed(jobId: number, errorMessage: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('scheduled_jobs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as failed: ${error.message}`);
  }
}

/**
 * Schedule recurring jobs (called after job completion to schedule next run)
 */
function isMonthlyOnFirstSchedule(schedule: string): boolean {
  // Matches "0 0 1 * *", "0 9 1 * *", etc. (minute hour day-of-month month day-of-week)
  const parts = schedule.trim().split(/\s+/);
  return parts.length === 5 && parts[2] === '1' && parts[3] === '*' && parts[4] === '*';
}

export async function scheduleNextRun(jobType: string, metadata?: Record<string, any>): Promise<void> {
  const schedule = metadata?.schedule || '0 8 * * *'; // Default to daily at 8 AM
  
  let nextRun: Date;
  
  if (isMonthlyOnFirstSchedule(schedule)) {
    // Monthly on the 1st. Preserve hour from cron when present (e.g. "0 9 1 * *" → 09:00 UTC).
    // Note: With daily cron at 8 AM UTC, jobs scheduled before 8 AM run at the next cron tick.
    const parts = schedule.trim().split(/\s+/);
    const hour = Number.parseInt(parts[1], 10);
    const minute = Number.parseInt(parts[0], 10);
    nextRun = new Date();
    nextRun.setUTCMonth(nextRun.getUTCMonth() + 1);
    nextRun.setUTCDate(1);
    nextRun.setUTCHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  } else if (schedule === '0 8 * * *') {
    // Daily at 8 AM
    nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(8, 0, 0, 0);
  } else if (schedule === '0 8 * * 1') {
    // Weekly: Monday at 8 AM UTC
    nextRun = new Date();
    const dayOfWeek = nextRun.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
    nextRun.setUTCDate(nextRun.getUTCDate() + daysUntilMonday);
    nextRun.setUTCHours(8, 0, 0, 0);
  } else {
    // Default: daily at 8 AM
    nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(8, 0, 0, 0);
  }

  await scheduleJob(jobType, nextRun, metadata);
}


