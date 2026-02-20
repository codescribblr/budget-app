import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getIncompleteTasks, type ProcessingTasksStatus } from '@/lib/processing-tasks';

/**
 * GET /api/import/queue/[batchId]/processing-status
 * Get processing tasks status for a batch
 */
export async function GET(
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

    // Get processing tasks from first transaction
    const { data: firstImport, error: fetchError } = await supabase
      .from('queued_imports')
      .select('processing_tasks, target_account_id, target_credit_card_id, is_historical')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !firstImport) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    const processingTasks = (firstImport.processing_tasks as ProcessingTasksStatus) || null;
    const incompleteTasks = processingTasks ? getIncompleteTasks(processingTasks) : [];
    const needsProcessing = incompleteTasks.length > 0;

    return NextResponse.json({
      processingTasks,
      incompleteTasks,
      needsProcessing,
      defaultAccountId: firstImport.target_account_id,
      defaultCreditCardId: firstImport.target_credit_card_id,
      isHistorical: firstImport.is_historical || false,
      // Read-only display: target account/card is set at queue time, not editable
      targetAccountId: firstImport.target_account_id,
      targetCreditCardId: firstImport.target_credit_card_id,
    });
  } catch (error: any) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processing status', message: error.message },
      { status: 500 }
    );
  }
}

