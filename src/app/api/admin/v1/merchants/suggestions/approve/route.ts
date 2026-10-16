import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { approveSuggestionsBulk } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * POST /api/admin/v1/merchants/suggestions/approve
 * Bulk-approve suggestions. Per-id results; one failure does not abort the batch.
 *
 * Body: {
 *   ids: number[],
 *   global_merchant_id?: number,
 *   display_name?: string,
 *   confidence?: number,
 *   reasoning?: string
 * }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new AdminApiError(400, 'validation_error', 'JSON body required');
  }
  if (!Array.isArray(body.ids)) {
    throw new AdminApiError(400, 'validation_error', 'ids must be an array');
  }

  const ids = body.ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id));
  const result = await approveSuggestionsBulk(context, ids, {
    global_merchant_id:
      typeof body.global_merchant_id === 'number' ? body.global_merchant_id : undefined,
    display_name: typeof body.display_name === 'string' ? body.display_name : undefined,
    confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
    reasoning: typeof body.reasoning === 'string' ? body.reasoning : undefined,
  });

  return NextResponse.json(adminV1Data(result, context));
});
