import { NextResponse } from 'next/server';
import { PremiumRequiredError } from '@/lib/subscription-utils';
import { InsufficientScopeError, InvalidApiKeyError } from './scopes';
import { RateLimitExceededError } from './rate-limiter';
import { ExternalApiNotFoundError, ExternalApiValidationError } from './query-helpers';
import { EXTERNAL_API_PREMIUM_DISABLED_MESSAGE } from './constants';

export type ExternalApiErrorCode =
  | 'invalid_api_key'
  | 'premium_required'
  | 'insufficient_scope'
  | 'validation_error'
  | 'not_found'
  | 'rate_limit_exceeded'
  | 'internal_error';

export interface ExternalApiErrorBody {
  error: {
    code: ExternalApiErrorCode;
    message: string;
    required_scope?: string;
    retry_after_seconds?: number;
  };
}

export function mapExternalApiErrorToStatus(error: unknown): number {
  if (error instanceof InvalidApiKeyError) return 401;
  if (error instanceof PremiumRequiredError) return 403;
  if (error instanceof InsufficientScopeError) return 403;
  if (error instanceof RateLimitExceededError) return 429;
  if (error instanceof ExternalApiValidationError) return 400;
  if (error instanceof ExternalApiNotFoundError) return 404;
  return 500;
}

export function mapExternalApiErrorToBody(error: unknown): ExternalApiErrorBody {
  if (error instanceof InvalidApiKeyError) {
    return { error: { code: 'invalid_api_key', message: error.message } };
  }
  if (error instanceof PremiumRequiredError) {
    return {
      error: {
        code: 'premium_required',
        message: error.message || EXTERNAL_API_PREMIUM_DISABLED_MESSAGE,
      },
    };
  }
  if (error instanceof InsufficientScopeError) {
    return {
      error: {
        code: 'insufficient_scope',
        message: error.message,
        required_scope: error.requiredScope,
      },
    };
  }
  if (error instanceof RateLimitExceededError) {
    return {
      error: {
        code: 'rate_limit_exceeded',
        message: error.message,
        retry_after_seconds: error.retryAfterSeconds,
      },
    };
  }
  if (error instanceof ExternalApiValidationError) {
    return { error: { code: 'validation_error', message: error.message } };
  }
  if (error instanceof ExternalApiNotFoundError) {
    return { error: { code: 'not_found', message: error.message } };
  }

  console.error('Unhandled external API error:', error);
  return { error: { code: 'internal_error', message: 'Internal server error' } };
}

export function externalApiErrorResponse(error: unknown): NextResponse {
  const status = mapExternalApiErrorToStatus(error);
  const body = mapExternalApiErrorToBody(error);
  const headers: Record<string, string> = {};

  if (error instanceof RateLimitExceededError) {
    headers['Retry-After'] = String(error.retryAfterSeconds);
  }

  return NextResponse.json(body, { status, headers });
}

export function externalApiJsonError(
  code: ExternalApiErrorCode,
  message: string,
  status: number,
  extra?: Partial<ExternalApiErrorBody['error']>
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...extra,
      },
    },
    { status }
  );
}
