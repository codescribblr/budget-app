import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { getUnlinkedMerchantStats } from '@/lib/db/backfill-unlinked-merchants';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * GET /api/admin/v1/merchants/unlinked-stats
 * Counts of transactions with no merchant group and no override, per user/account.
 * Query: ?user_id=optional-uuid
 */
export const GET = withAdminV1Auth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') || undefined;

  if (userId) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(userId)) {
      throw new AdminApiError(400, 'validation_error', 'user_id must be a UUID');
    }
  }

  try {
    const result = await getUnlinkedMerchantStats({ userId });
    return NextResponse.json(adminV1Data(result, context));
  } catch (error) {
    console.error('[admin-api] unlinked-stats failed:', error);
    throw new AdminApiError(500, 'internal_error', 'Failed to load unlinked merchant stats');
  }
});
