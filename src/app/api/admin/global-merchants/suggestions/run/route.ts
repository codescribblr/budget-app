import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { handleSuggestMerchantGroupings } from '@/lib/scheduled-jobs/job-handlers';

/**
 * POST /api/admin/global-merchants/suggestions/run
 * Manually trigger the AI merchant suggestions job (admin only).
 */
export async function POST() {
  try {
    await requireAdmin();
    const result = await handleSuggestMerchantGroupings();
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'Suggestions generated. Refresh the list to see them.',
      });
    }
    return NextResponse.json(
      { success: false, error: result.error || 'Job failed' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error running suggestions job:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to run suggestions' },
      { status: 500 }
    );
  }
}
