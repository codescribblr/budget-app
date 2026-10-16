import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { getGlobalMerchant, updateGlobalMerchant } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';
import type { AdminApiContext } from '@/lib/admin-api/types';

type RouteContext = { params: Promise<{ id: string }> };

function parseMerchantId(id: string): number {
  const merchantId = parseInt(id, 10);
  if (Number.isNaN(merchantId)) {
    throw new AdminApiError(400, 'validation_error', 'Invalid merchant ID');
  }
  return merchantId;
}

/**
 * GET /api/admin/v1/merchants/:id
 * Fetch one global merchant and its patterns.
 */
export async function GET(request: NextRequest, routeContext: RouteContext) {
  const wrapped = withAdminV1Auth(async (_req, context: AdminApiContext) => {
    const { id } = await routeContext.params;
    const result = await getGlobalMerchant(parseMerchantId(id));
    return NextResponse.json(adminV1Data(result, context));
  });
  return wrapped(request);
}

/**
 * PATCH /api/admin/v1/merchants/:id
 * Update display_name, status, logo_url, and/or icon_name.
 * Body: { display_name?, status?, logo_url?, icon_name? }
 * Name collision → 409 with existing_id.
 */
export async function PATCH(request: NextRequest, routeContext: RouteContext) {
  const wrapped = withAdminV1Auth(async (req, context: AdminApiContext) => {
    const { id } = await routeContext.params;
    const merchantId = parseMerchantId(id);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new AdminApiError(400, 'validation_error', 'JSON body required');
    }

    const input: {
      display_name?: string;
      status?: 'active' | 'draft';
      logo_url?: string | null;
      icon_name?: string | null;
    } = {};

    if (body.display_name !== undefined) {
      if (typeof body.display_name !== 'string') {
        throw new AdminApiError(400, 'validation_error', 'display_name must be a string');
      }
      input.display_name = body.display_name;
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'draft') {
        throw new AdminApiError(400, 'validation_error', 'status must be active or draft');
      }
      input.status = body.status;
    }
    if (body.logo_url !== undefined) {
      input.logo_url = body.logo_url === null || body.logo_url === '' ? null : String(body.logo_url);
    }
    if (body.icon_name !== undefined) {
      input.icon_name =
        body.icon_name === null || body.icon_name === '' ? null : String(body.icon_name);
    }

    if (
      input.display_name === undefined &&
      input.status === undefined &&
      input.logo_url === undefined &&
      input.icon_name === undefined
    ) {
      throw new AdminApiError(400, 'validation_error', 'No updatable fields provided');
    }

    const result = await updateGlobalMerchant(context, merchantId, input);
    return NextResponse.json(adminV1Data(result, context));
  });
  return wrapped(request);
}
