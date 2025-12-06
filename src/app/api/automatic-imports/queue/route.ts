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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    if (batches) {
      // Return batches
      const batchList = await getQueuedImportBatches();
      return NextResponse.json({ batches: batchList });
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
