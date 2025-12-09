import { NextResponse } from 'next/server';
import { getQueuedImports, getQueuedImportBatches } from '@/lib/automatic-imports/queue-manager';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * GET /api/automatic-imports/queue
 * Get queued imports
 */
export async function GET(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'reviewing' | 'approved' | 'rejected' | 'imported' | undefined;
    const importSetupId = searchParams.get('importSetupId') ? parseInt(searchParams.get('importSetupId')!) : undefined;
    const batchId = searchParams.get('batchId') || undefined;
    const batches = searchParams.get('batches') === 'true';
    const csvFieldsOnly = searchParams.get('csvFields') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    if (batches) {
      // Return batches
      const batchList = await getQueuedImportBatches();
      return NextResponse.json({ batches: batchList });
    } else if (csvFieldsOnly && batchId) {
      // Special endpoint to fetch CSV fields directly (workaround for PostgREST schema cache issues)
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { getActiveAccountId } = await import('@/lib/account-context');
      const accountId = await getActiveAccountId();
      if (!accountId) {
        return NextResponse.json({ error: 'No active account' }, { status: 400 });
      }
      
      // Query first record by batch ID to get CSV fields
      const { data: csvRecord, error: csvError } = await supabase
        .from('queued_imports')
        .select('csv_data, csv_analysis, csv_file_name, csv_mapping_name, csv_mapping_template_id, csv_fingerprint')
        .eq('account_id', accountId)
        .eq('source_batch_id', batchId)
        .not('csv_data', 'is', null)
        .limit(1)
        .single();
      
      if (csvError || !csvRecord) {
        return NextResponse.json({ csvFields: null });
      }
      
      return NextResponse.json({ csvFields: csvRecord });
    } else {
      // Return individual imports
      const imports = await getQueuedImports({
        status,
        importSetupId,
        batchId,
        limit,
        offset,
      });
      return NextResponse.json({ imports });
    }
  } catch (error: any) {
    console.error('Error in GET /api/automatic-imports/queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queued imports' },
      { status: 500 }
    );
  }
}
