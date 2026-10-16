import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { backfillUnlinkedMerchantTransactions } from '@/lib/db/backfill-unlinked-merchants';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * POST /api/admin/v1/merchants/backfill-unlinked
 * Page through transactions with no merchant group / override and link them.
 * Body (optional): { user_id?: string, limit?: number, cursor?: number }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => ({}));
  const userId =
    typeof body?.user_id === 'string' && body.user_id.trim()
      ? body.user_id.trim()
      : undefined;
  const limit =
    typeof body?.limit === 'number' && Number.isFinite(body.limit) ? body.limit : undefined;
  const cursor =
    typeof body?.cursor === 'number' && Number.isFinite(body.cursor) ? body.cursor : undefined;

  if (userId != null) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(userId)) {
      throw new AdminApiError(400, 'validation_error', 'user_id must be a UUID');
    }
  }

  try {
    const result = await backfillUnlinkedMerchantTransactions({
      userId,
      limit,
      cursor,
    });
    return NextResponse.json(adminV1Data(result, context));
  } catch (error) {
    console.error('[admin-api] backfill-unlinked failed:', error);
    throw new AdminApiError(500, 'internal_error', 'Failed to backfill unlinked merchants');
  }
});
