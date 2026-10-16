import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-api/auth';
import { adminApiErrorResponse } from '@/lib/admin-api/errors';
import { rotateAdminApiKey } from '@/lib/admin-api/keys';

/**
 * POST /api/admin/api-keys/[id]/rotate
 * Body: { grace_seconds?: number } — keep old secret valid for this many seconds
 * Returns the new full secret once.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const graceSeconds =
      typeof body.grace_seconds === 'number' ? body.grace_seconds : undefined;
    const result = await rotateAdminApiKey(id, { grace_seconds: graceSeconds });
    return NextResponse.json(result);
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
