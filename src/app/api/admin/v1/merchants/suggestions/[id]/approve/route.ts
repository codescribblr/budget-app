import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import { approveSuggestion } from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';
import type { AdminApiContext } from '@/lib/admin-api/types';

type RouteContext = { params: Promise<{ id: string }> };

async function handleApprove(
  request: NextRequest,
  context: AdminApiContext,
  routeContext: RouteContext
) {
  const { id } = await routeContext.params;
  const suggestionId = parseInt(id, 10);
  if (Number.isNaN(suggestionId)) {
    throw new AdminApiError(400, 'validation_error', 'Invalid suggestion ID');
  }

  const body = await request.json().catch(() => ({}));
  const result = await approveSuggestion(context, suggestionId, {
    global_merchant_id:
      typeof body.global_merchant_id === 'number' ? body.global_merchant_id : undefined,
    display_name: typeof body.display_name === 'string' ? body.display_name : undefined,
    confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
    reasoning: typeof body.reasoning === 'string' ? body.reasoning : undefined,
  });

  return NextResponse.json(adminV1Data(result, context));
}

/**
 * POST /api/admin/v1/merchants/suggestions/:id/approve
 * Approve a suggestion (idempotent; skips patterns mapped to a different merchant).
 *
 * Body (optional): {
 *   global_merchant_id?: number,
 *   display_name?: string,
 *   confidence?: number,
 *   reasoning?: string
 * }
 */
export async function POST(request: NextRequest, routeContext: RouteContext) {
  const wrapped = withAdminV1Auth((req, ctx) => handleApprove(req, ctx, routeContext));
  return wrapped(request);
}
