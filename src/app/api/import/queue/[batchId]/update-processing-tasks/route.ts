import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/import/queue/[batchId]/update-processing-tasks
 * Update processing tasks completion status for a batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;
    const body = await request.json();
    const { processingTasks } = body as {
      processingTasks: Record<string, boolean>;
    };

    if (!processingTasks) {
      return NextResponse.json(
        { error: 'processingTasks is required' },
        { status: 400 }
      );
    }

    // Update processing_tasks on the first transaction of the batch
    // (processing_tasks is stored only on the first transaction)
    const { error: updateError } = await supabase
      .from('queued_imports')
      .update({ processing_tasks: processingTasks })
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .not('processing_tasks', 'is', null) // Only update records that have processing_tasks
      .limit(1);

    if (updateError) {
      console.error('Error updating processing tasks:', updateError);
      return NextResponse.json(
        { error: 'Failed to update processing tasks', details: updateError.message },
        { status: 500 }
      );
    }

    // If no records were updated (processing_tasks was null), update the first transaction
    const { count } = await supabase
      .from('queued_imports')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .not('processing_tasks', 'is', null);

    if (count === 0) {
      // Update the first transaction of the batch
      const { error: firstUpdateError } = await supabase
        .from('queued_imports')
        .update({ processing_tasks: processingTasks })
        .eq('account_id', accountId)
        .eq('source_batch_id', batchId)
        .order('id', { ascending: true })
        .limit(1);

      if (firstUpdateError) {
        console.error('Error updating first transaction processing tasks:', firstUpdateError);
        return NextResponse.json(
          { error: 'Failed to update processing tasks', details: firstUpdateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating processing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to update processing tasks', message: error.message },
      { status: 500 }
    );
  }
}
