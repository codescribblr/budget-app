import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { mapPatternsToMerchant } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * POST /api/admin/v1/merchants/mappings
 * Auto-approve: map pattern_ids to a global merchant and sync user transactions.
 *
 * Body: {
 *   merchant_id?: number,
 *   display_name?: string,  // create or reuse by name if merchant_id omitted
 *   pattern_ids: number[],
 *   confidence?: number,
 *   reasoning?: string
 * }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new AdminApiError(400, 'validation_error', 'JSON body required');
  }
  if (!Array.isArray(body.pattern_ids)) {
    throw new AdminApiError(400, 'validation_error', 'pattern_ids must be an array');
  }

  const result = await mapPatternsToMerchant(context, {
    merchant_id: typeof body.merchant_id === 'number' ? body.merchant_id : undefined,
    display_name: typeof body.display_name === 'string' ? body.display_name : undefined,
    pattern_ids: body.pattern_ids,
    confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
    reasoning: typeof body.reasoning === 'string' ? body.reasoning : undefined,
  });

  return NextResponse.json(adminV1Data(result, context), { status: 201 });
});
