export const EXTERNAL_API_RATE_LIMIT_PER_MINUTE = parseInt(
  process.env.EXTERNAL_API_RATE_LIMIT_PER_MINUTE ?? '120',
  10
);

export const EXTERNAL_API_RATE_LIMIT_PER_DAY = parseInt(
  process.env.EXTERNAL_API_RATE_LIMIT_PER_DAY ?? '10000',
  10
);

export const EXTERNAL_API_IDEMPOTENCY_TTL_HOURS = 24;

export const EXTERNAL_API_USAGE_LOG_RETENTION_DAYS = 90;

export const EXTERNAL_API_PREMIUM_DISABLED_MESSAGE =
  'External API is disabled. Renew your premium subscription to use API keys.';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

export const MAX_SEARCH_QUERY_LENGTH = 100;
