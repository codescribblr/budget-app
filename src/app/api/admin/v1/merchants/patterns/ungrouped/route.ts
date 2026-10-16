import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { listUngroupedPatterns } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * GET /api/admin/v1/merchants/patterns/ungrouped
 * List ungrouped global merchant patterns (paginated).
 */
export const GET = withAdminV1Auth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 500);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const minUsageRaw = searchParams.get('min_usage');
  const minUsage = minUsageRaw != null ? parseInt(minUsageRaw, 10) : undefined;
  const q = searchParams.get('q') || undefined;

  if (minUsage != null && Number.isNaN(minUsage)) {
    throw new AdminApiError(400, 'validation_error', 'min_usage must be a number');
  }

  const result = await listUngroupedPatterns({ limit, offset, minUsage, q });
  return NextResponse.json(adminV1Data(result, context));
});
