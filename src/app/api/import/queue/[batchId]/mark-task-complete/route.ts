import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { markTaskComplete, type ProcessingTasksStatus } from '@/lib/processing-tasks';

/**
 * POST /api/import/queue/[batchId]/mark-task-complete
 * Mark a specific processing task as complete for a batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { supabase } = await getAuthenticatedUser();
    
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;
    const body = await request.json();
    const { task } = body as {
      task: keyof ProcessingTasksStatus;
    };

    if (!task) {
      return NextResponse.json(
        { error: 'task is required' },
        { status: 400 }
      );
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
    const { error: updateError } = await supabase
      .from('queued_imports')
      .update({ processing_tasks: updatedTasks })
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .order('id', { ascending: true })
      .limit(1);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update processing tasks', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to mark task complete', message: error.message },
      { status: 500 }
    );
  }
}
