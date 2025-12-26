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
 * Schedule a job to run at a specific time
 */
export async function scheduleJob(
  jobType: string,
  scheduledFor: Date,
  metadata?: Record<string, any>
): Promise<number> {
  const supabase = createServiceRoleClient();

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
export async function scheduleNextRun(jobType: string, metadata?: Record<string, any>): Promise<void> {
  const schedule = metadata?.schedule || '0 8 * * *'; // Default to daily at 8 AM
  
  let nextRun: Date;
  
  if (schedule === '0 0 1 * *') {
    // Monthly on 1st at midnight UTC
    // Note: With daily cron at 8 AM UTC, this will execute at 8 AM UTC on the 1st
    // If cron frequency increases in the future, it will execute closer to midnight
    nextRun = new Date();
    nextRun.setMonth(nextRun.getMonth() + 1);
    nextRun.setDate(1);
    nextRun.setHours(0, 0, 0, 0);
  } else if (schedule === '0 8 * * *') {
    // Daily at 8 AM
    nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(8, 0, 0, 0);
  } else {
    // Default: daily at 8 AM
    nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(8, 0, 0, 0);
  }

  await scheduleJob(jobType, nextRun, metadata);
}

