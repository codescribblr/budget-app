import { createHash, timingSafeEqual } from 'node:crypto';
export function cronAuthorization(header: string | null, env: Record<string, string | undefined> = process.env): 200 | 401 | 503 {
  if (env.SCHEDULED_JOBS_ENABLED === 'false' || !env.CRON_SECRET?.trim()) return 503;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(header || ''), hash(`Bearer ${env.CRON_SECRET}`)) ? 200 : 401;
}
