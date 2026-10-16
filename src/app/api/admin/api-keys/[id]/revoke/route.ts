import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-api/auth';
import { adminApiErrorResponse } from '@/lib/admin-api/errors';
import { revokeAdminApiKey } from '@/lib/admin-api/keys';

/**
 * POST /api/admin/api-keys/[id]/revoke
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    await revokeAdminApiKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
