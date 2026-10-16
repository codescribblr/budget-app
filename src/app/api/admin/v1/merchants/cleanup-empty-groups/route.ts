import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { cleanupEmptyMerchantGroups } from '@/lib/db/cleanup-empty-merchant-groups';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * POST /api/admin/v1/merchants/cleanup-empty-groups
 * Set-based delete of empty unlinked per-user merchant groups.
 * Body (optional): { user_id?: string }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => ({}));
  const userId =
    typeof body?.user_id === 'string' && body.user_id.trim()
      ? body.user_id.trim()
      : undefined;

  if (userId != null) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(userId)) {
      throw new AdminApiError(400, 'validation_error', 'user_id must be a UUID');
    }
  }

  try {
    const result = await cleanupEmptyMerchantGroups({ userId });
    return NextResponse.json(adminV1Data(result, context));
  } catch (error) {
    console.error('[admin-api] cleanup-empty-groups failed:', error);
    throw new AdminApiError(500, 'internal_error', 'Failed to clean up empty merchant groups');
  }
});
