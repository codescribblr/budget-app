import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { cleanupEmptyMerchantGroups } from '@/lib/db/cleanup-empty-merchant-groups';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * POST /api/admin/v1/merchants/cleanup-empty-groups
 * Delete empty unlinked per-user merchant groups (safe orphan cleanup).
 * Body (optional): { limit?: number }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => ({}));
  const limit =
    typeof body?.limit === 'number' && Number.isFinite(body.limit)
      ? body.limit
      : undefined;

  try {
    const result = await cleanupEmptyMerchantGroups({ limit });
    return NextResponse.json(adminV1Data(result, context));
  } catch (error) {
    console.error('[admin-api] cleanup-empty-groups failed:', error);
    throw new AdminApiError(500, 'internal_error', 'Failed to clean up empty merchant groups');
  }
});
