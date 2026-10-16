import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { mergeGlobalMerchant } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';
import type { AdminApiContext } from '@/lib/admin-api/types';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/v1/merchants/:id/merge
 * Merge this merchant into another. Body: { into_id: number }
 * (also accepts target_merchant_id for parity with the session admin route)
 */
export async function POST(request: NextRequest, routeContext: RouteContext) {
  const wrapped = withAdminV1Auth(async (req, context: AdminApiContext) => {
    const { id } = await routeContext.params;
    const sourceId = parseInt(id, 10);
    if (Number.isNaN(sourceId)) {
      throw new AdminApiError(400, 'validation_error', 'Invalid merchant ID');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new AdminApiError(400, 'validation_error', 'JSON body required');
    }

    const intoId =
      typeof body.into_id === 'number'
        ? body.into_id
        : typeof body.target_merchant_id === 'number'
          ? body.target_merchant_id
          : null;

    if (intoId == null) {
      throw new AdminApiError(400, 'validation_error', 'into_id is required');
    }

    const result = await mergeGlobalMerchant(context, sourceId, intoId);
    return NextResponse.json(adminV1Data(result, context));
  });
  return wrapped(request);
}
