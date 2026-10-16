import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import {
  createPendingSuggestions,
  listPendingSuggestions,
} from '@/lib/admin-api/merchant-ops';
import { AdminApiError } from '@/lib/admin-api/errors';

/**
 * GET /api/admin/v1/merchants/suggestions
 * List pending global merchant suggestions (same queue as /admin/merchant-suggestions).
 */
export const GET = withAdminV1Auth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const batchId = searchParams.get('batch_id') || undefined;

  const result = await listPendingSuggestions({ limit, offset, batchId });
  return NextResponse.json(adminV1Data(result, context));
});

/**
 * POST /api/admin/v1/merchants/suggestions
 * Create pending suggestions for Jon's review queue (respects pattern rejections).
 *
 * Body: {
 *   batch_id?: string,
 *   suggestions: [{
 *     merchant_id?: number | null,
 *     display_name?: string | null,
 *     pattern_ids: number[],
 *     confidence?: number,
 *     reasoning?: string
 *   }]
 * }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new AdminApiError(400, 'validation_error', 'JSON body required');
  }

  const result = await createPendingSuggestions(context, {
    suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
    batch_id: typeof body.batch_id === 'string' ? body.batch_id : undefined,
  });

  return NextResponse.json(adminV1Data(result, context), { status: 201 });
});
