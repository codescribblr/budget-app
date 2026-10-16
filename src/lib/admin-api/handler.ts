import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminV1Request } from './auth';
import { adminApiErrorResponse } from './errors';
import type { AdminApiContext } from './types';

type AdminV1Handler = (
  request: NextRequest,
  context: AdminApiContext
) => Promise<NextResponse>;

export function withAdminV1Auth(handler: AdminV1Handler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const context = await authenticateAdminV1Request(
        request.headers.get('authorization')
      );
      return await handler(request, context);
    } catch (error) {
      return adminApiErrorResponse(error);
    }
  };
}

export function adminV1Data<T>(data: T, context: AdminApiContext, extraMeta?: Record<string, unknown>) {
  return {
    data,
    meta: {
      auth_mode: context.mode,
      api_key_id: context.apiKeyId,
      ...extraMeta,
    },
  };
}
