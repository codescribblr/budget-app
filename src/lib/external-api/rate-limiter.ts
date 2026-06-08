import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  EXTERNAL_API_RATE_LIMIT_PER_DAY,
  EXTERNAL_API_RATE_LIMIT_PER_MINUTE,
} from './constants';

export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded. Retry later.');
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function checkExternalApiRateLimit(apiKeyId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();

  const [{ count: minuteCount, error: minuteError }, { count: dayCount, error: dayError }] =
    await Promise.all([
      supabase
        .from('api_key_usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', apiKeyId)
        .gte('created_at', minuteAgo),
      supabase
        .from('api_key_usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', apiKeyId)
        .gte('created_at', dayAgo),
    ]);

  if (minuteError) {
    console.error('Error checking external API minute rate limit:', minuteError);
    return;
  }
  if (dayError) {
    console.error('Error checking external API daily rate limit:', dayError);
    return;
  }

  if ((minuteCount ?? 0) >= EXTERNAL_API_RATE_LIMIT_PER_MINUTE) {
    throw new RateLimitExceededError(60);
  }

  if ((dayCount ?? 0) >= EXTERNAL_API_RATE_LIMIT_PER_DAY) {
    throw new RateLimitExceededError(3600);
  }
}
