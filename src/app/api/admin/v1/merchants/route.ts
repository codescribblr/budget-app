import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { createGlobalMerchant, listGlobalMerchants } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * GET /api/admin/v1/merchants
 * List/search global merchants.
 */
export const GET = withAdminV1Auth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || undefined;
  const statusParam = searchParams.get('status') || 'all';
  const status =
    statusParam === 'active' || statusParam === 'draft' || statusParam === 'all'
      ? statusParam
      : 'all';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 500);

  const result = await listGlobalMerchants({ q, status, limit });
  return NextResponse.json(adminV1Data(result, context));
});

/**
 * POST /api/admin/v1/merchants
 * Create a global merchant.
 * Body: { display_name: string, status?: 'active' | 'draft' }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new AdminApiError(400, 'validation_error', 'JSON body required');
  }
  const merchant = await createGlobalMerchant(context, {
    display_name: String(body.display_name ?? ''),
    status: body.status === 'draft' ? 'draft' : 'active',
  });
  return NextResponse.json(adminV1Data({ merchant }, context), { status: 201 });
});
