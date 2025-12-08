import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * DELETE /api/automatic-imports/queue/batch/[batchId]/delete
 * Delete all transactions in a queued import batch (marks as rejected)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;

    // Get setup info to determine source type
    const { data: queuedImports } = await supabase
      .from('queued_imports')
      .select('import_setup_id')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .limit(1);

    if (!queuedImports || queuedImports.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const importSetupId = queuedImports[0].import_setup_id;

    // Fetch setup to get source_type
    const { data: setup } = await supabase
      .from('automatic_import_setups')
      .select('source_type, integration_name')
      .eq('id', importSetupId)
      .single();

    // Update all transactions in batch to rejected status
    const { data, error } = await supabase
      .from('queued_imports')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .in('status', ['pending', 'reviewing']) // Only update pending/reviewing, not already imported
      .select('id');

    if (error) {
      console.error('Error deleting batch:', error);
      return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
    }

    // Clean up manual import setups if this was a manual upload batch
    if (setup?.source_type === 'manual') {
      try {
        const { cleanupManualImportSetups } = await import('@/lib/automatic-imports/queue-manager');
        await cleanupManualImportSetups(accountId);
      } catch (err) {
        // Non-fatal - just log
        console.warn('Failed to cleanup manual import setups:', err);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
      source_type: setup?.source_type || 'unknown',
      integration_name: setup?.integration_name || 'Unknown',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/automatic-imports/queue/batch/[batchId]/delete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
