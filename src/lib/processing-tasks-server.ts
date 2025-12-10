/**
 * Server-side helper functions for updating processing tasks in the database
 * These functions can be called from API routes (server-side)
 * 
 * IMPORTANT: This file uses server-only imports and should NEVER be imported
 * in client-side code. Use dynamic imports with typeof window checks if needed.
 */

import { markTaskComplete, type ProcessingTasksStatus } from './processing-tasks';

/**
 * Mark a processing task as complete for a batch (server-side)
 * This should be used from API routes, not client-side code
 */
export async function markTaskCompleteForBatchServer(
  batchId: string,
  task: keyof ProcessingTasksStatus
): Promise<void> {
  try {
    // Dynamically import server-only modules to avoid client-side bundling
    const { createClient } = await import('@/lib/supabase/server');
    const { getActiveAccountId } = await import('@/lib/account-context');
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      throw new Error('No active account');
    }

    // Get current processing tasks from first transaction
    const { data: firstImport, error: fetchError } = await supabase
      .from('queued_imports')
      .select('processing_tasks')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    let updatedTasks: ProcessingTasksStatus;

    if (fetchError || !firstImport || !firstImport.processing_tasks) {
      // If no processing_tasks exists, initialize it
      updatedTasks = {
        [task]: true,
      } as ProcessingTasksStatus;
    } else {
      // Update existing tasks
      const currentTasks = (firstImport.processing_tasks as ProcessingTasksStatus) || {};
      updatedTasks = markTaskComplete(currentTasks, task);
    }

    // Update processing_tasks on first transaction
    // We need to get the ID of the first transaction first, then update it
    const { data: firstImportForUpdate, error: fetchIdError } = await supabase
      .from('queued_imports')
      .select('id')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (fetchIdError || !firstImportForUpdate) {
      throw new Error('Failed to find first transaction in batch');
    }

    const { error: updateError } = await supabase
      .from('queued_imports')
      .update({ processing_tasks: updatedTasks })
      .eq('id', firstImportForUpdate.id)
      .eq('account_id', accountId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    // Task completion tracking is not critical - fail silently
  }
}
