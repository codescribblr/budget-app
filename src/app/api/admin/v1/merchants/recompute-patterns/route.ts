import { NextRequest, NextResponse } from 'next/server';
import { withAdminV1Auth, adminV1Data } from '@/lib/admin-api/handler';
import {
  recomputeNormalizedPatternsBatch,
  type RecomputePhase,
} from '@/lib/db/recompute-normalized-patterns';
import { AdminApiError } from '@/lib/admin-api/errors';

const PHASES: RecomputePhase[] = [
  'recompute_global',
  'recompute_mappings',
  'inherit',
];

/**
 * POST /api/admin/v1/merchants/recompute-patterns
 * Batched recompute / inherit formerly inlined in migration 127.
 * Body (optional): {
 *   phase?: 'recompute_global' | 'recompute_mappings' | 'inherit',
 *   limit?: number,
 *   cursor?: number,
 *   sync?: boolean  // inherit only; default true
 * }
 */
export const POST = withAdminV1Auth(async (request: NextRequest, context) => {
  const body = await request.json().catch(() => ({}));

  const phaseRaw =
    typeof body?.phase === 'string' && body.phase.trim()
      ? body.phase.trim()
      : 'recompute_global';
  if (!PHASES.includes(phaseRaw as RecomputePhase)) {
    throw new AdminApiError(
      400,
      'validation_error',
      `phase must be one of: ${PHASES.join(', ')}`
    );
  }
  const phase = phaseRaw as RecomputePhase;

  const limit =
    typeof body?.limit === 'number' && Number.isFinite(body.limit)
      ? body.limit
      : undefined;
  const cursor =
    typeof body?.cursor === 'number' && Number.isFinite(body.cursor)
      ? body.cursor
      : undefined;
  const sync = typeof body?.sync === 'boolean' ? body.sync : undefined;

  try {
    const result = await recomputeNormalizedPatternsBatch({
      phase,
      limit,
      cursor,
      sync,
    });
    return NextResponse.json(adminV1Data(result, context));
  } catch (error) {
    console.error('[admin-api] recompute-patterns failed:', error);
    throw new AdminApiError(
      500,
      'internal_error',
      'Failed to recompute normalized patterns'
    );
  }
});
