/**
 * Job scheduler - manages scheduled jobs in the database
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { randomUUID } from 'node:crypto';
import { nextScheduledRun } from './next-run';

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
  lease_token: string | null;
  lease_expires_at: string | null;
  attempt: number;
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

/** Atomically claim one due row; another worker can never claim the same run. */
export async function claimJob(jobId: number): Promise<ScheduledJob | null> {
  const { data, error } = await createServiceRoleClient().rpc('claim_scheduled_job', { p_job_id: jobId, p_token: randomUUID() });
  if (error) throw Error('Scheduled job claim unavailable');
  return data?.[0] || null;
}
export async function renewJob(job: ScheduledJob): Promise<boolean> {
  const { data, error } = await createServiceRoleClient().rpc('renew_scheduled_job', { p_job_id: job.id, p_token: job.lease_token });
  return !error && data === true;
}
export async function expireJobLeases(): Promise<number> {
  const { data, error } = await createServiceRoleClient().rpc('expire_scheduled_job_leases');
  if (error) throw Error('Scheduled job recovery unavailable');
  return Number(data || 0);
}
export async function finishJob(job: ScheduledJob, success: boolean, message: string): Promise<void> {
  const next = success ? nextScheduledRun(job.metadata?.schedule).toISOString() : null;
  const { data, error } = await createServiceRoleClient().rpc('finish_scheduled_job', {
    p_job_id: job.id, p_token: job.lease_token, p_success: success, p_message: message, p_next_run: next,
  });
  if (error || data !== true) throw Error('Job completion could not be recorded or its lease was lost');
}
export async function failedJobCount(): Promise<number> {
  const { count, error } = await createServiceRoleClient().from('scheduled_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed').is('failure_reviewed_at', null);
  if (error) throw Error('Scheduled job failure status unavailable');
  return count || 0;
}
