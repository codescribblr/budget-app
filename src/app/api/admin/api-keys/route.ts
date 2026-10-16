import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-api/auth';
import { adminApiErrorResponse } from '@/lib/admin-api/errors';
import { createAdminApiKey, listAdminApiKeys } from '@/lib/admin-api/keys';

/**
 * GET /api/admin/api-keys
 * List shared admin API keys (session admin only).
 */
export async function GET() {
  try {
    await requireAdminSession();
    const keys = await listAdminApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}

/**
 * POST /api/admin/api-keys
 * Create a named admin API key. Returns the full secret once.
 * Body: { name: string, expires_at?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAdminSession();
    const body = await request.json().catch(() => ({}));
    const result = await createAdminApiKey({
      name: String(body.name ?? ''),
      createdBy: userId,
      expiresAt: body.expires_at ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
