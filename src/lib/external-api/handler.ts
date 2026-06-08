import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKeyRequest, logApiKeyUsage } from './auth';
import { checkExternalApiRateLimit } from './rate-limiter';
import { InsufficientScopeError, requireScope } from './scopes';
import type { ApiScopeSection, ExternalApiContext } from './types';
import {
  assertValidIdempotencyKey,
  getCachedIdempotentResponse,
  getIdempotencyKey,
  isWriteMethod,
  storeIdempotentResponse,
} from './idempotency';
import {
  externalApiErrorResponse,
  mapExternalApiErrorToBody,
  mapExternalApiErrorToStatus,
} from './errors';
import { runWithExternalApiContext } from './operation-context';

type ExternalApiHandler = (
  request: NextRequest,
  context: ExternalApiContext
) => Promise<NextResponse>;

async function runExternalApiRequest(
  request: NextRequest,
  context: ExternalApiContext,
  handler: ExternalApiHandler
): Promise<NextResponse> {
  const idempotencyKey = getIdempotencyKey(request);
  const method = request.method.toUpperCase();
  const path = request.nextUrl.pathname;

  if (idempotencyKey && isWriteMethod(method)) {
    assertValidIdempotencyKey(idempotencyKey);
    const cached = await getCachedIdempotentResponse(
      context.apiKeyId,
      idempotencyKey,
      method,
      path
    );
    if (cached) return cached;
  }

  const response = await handler(request, context);

  if (
    idempotencyKey &&
    isWriteMethod(method) &&
    response.status >= 200 &&
    response.status < 300
  ) {
    try {
      const responseBody = await response.clone().json();
      await storeIdempotentResponse(
        context.apiKeyId,
        idempotencyKey,
        method,
        path,
        response.status,
        responseBody
      );
    } catch (error) {
      console.error('Failed to persist idempotent response:', error);
    }
  }

  return response;
}

function logUsage(
  context: ExternalApiContext,
  request: NextRequest,
  scopeUsed: string | null,
  statusCode: number
): void {
  void logApiKeyUsage({
    apiKeyId: context.apiKeyId,
    method: request.method,
    path: request.nextUrl.pathname,
    scopeUsed,
    statusCode,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
  });
}

export function withExternalApiAuth(handler: ExternalApiHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    let apiContext: ExternalApiContext | null = null;

    try {
      apiContext = await authenticateApiKeyRequest(request.headers.get('authorization'));
      await checkExternalApiRateLimit(apiContext.apiKeyId);
      const response = await runExternalApiRequest(request, apiContext, handler);
      logUsage(apiContext, request, null, response.status);
      return response;
    } catch (error) {
      const response = externalApiErrorResponse(error);
      if (apiContext) {
        logUsage(apiContext, request, null, response.status);
      }
      return response;
    }
  };
}

export function withExternalApi(section: ApiScopeSection, handler: ExternalApiHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    let scopeUsed: string | null = null;
    let apiContext: ExternalApiContext | null = null;

    try {
      apiContext = await authenticateApiKeyRequest(request.headers.get('authorization'));
      await checkExternalApiRateLimit(apiContext.apiKeyId);
      scopeUsed = requireScope(apiContext.permissions, section, request.method);
      const response = await runExternalApiRequest(request, apiContext, handler);
      logUsage(apiContext, request, scopeUsed, response.status);
      return response;
    } catch (error) {
      const response = externalApiErrorResponse(error);
      if (apiContext) {
        logUsage(apiContext, request, scopeUsed, response.status);
      }
      return response;
    }
  };
}

export function externalApiData<T>(data: T, context: ExternalApiContext) {
  return {
    data,
    meta: {
      account_id: context.budgetAccountId,
      api_key_id: context.apiKeyId,
    },
  };
}

/** Run an existing internal service handler under external API auth/account context. */
export function withExternalApiService(
  section: ApiScopeSection,
  handler: (request: NextRequest, context: ExternalApiContext) => Promise<NextResponse>
) {
  return withExternalApi(section, async (request, context) => {
    return runWithExternalApiContext(context, () => handler(request, context));
  });
}

/** @deprecated Use externalApiErrorResponse from ./errors */
export function mapErrorToStatus(error: unknown): number {
  return mapExternalApiErrorToStatus(error);
}

/** @deprecated Use mapExternalApiErrorToBody from ./errors */
export function mapErrorToBody(error: unknown) {
  return mapExternalApiErrorToBody(error);
}
