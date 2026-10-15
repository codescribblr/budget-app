import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { ProcessingTasksStatus } from '@/lib/processing-tasks';
import { persistCompletedTasks } from '@/lib/processing-tasks-server';

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

    if (!['pdf_to_csv', 'csv_mapping', 'duplicate_detection', 'categorization', 'ai_categorization', 'import_defaults_assignment'].includes(task)) {
      return NextResponse.json(
        { error: 'task is required' },
        { status: 400 }
      );
    }

    await persistCompletedTasks(supabase, accountId, batchId, [task]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to mark task complete', message: error.message },
      { status: 500 }
    );
  }
}

