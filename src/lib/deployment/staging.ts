// Functional staging shares an active development backend. Only explicitly
// provisioned synthetic users may enter it; provider operations stay disabled.
import { TESTING_SUPABASE_URL } from './staging-project';
import { isStagingGoogleUser, stagingGoogleCheckEnabled, type GoogleCheckEnv, type GoogleCheckUser } from './staging-google';
export { TESTING_SUPABASE_URL } from './staging-project';
const publicPaths = new Set(['/login', '/privacy', '/terms', '/api/health/live', '/api/health/ready', '/api/version', '/version.json', '/manifest.json', '/sw.js']);
const disabledPrefixes = ['/signup', '/auth', '/invite', '/api/auth', '/api/cron', '/api/webhooks', '/api/push', '/api/ai', '/api/automatic-imports/teller', '/api/automatic-imports/setups', '/api/automatic-imports/email-domain', '/api/integrations', '/api/settings/integrations', '/api/settings/api-keys', '/api/help/feedback', '/api/interface-feedback', '/api/test', '/api/v1', '/api/recurring-transactions/detect'];
export function stagingPathDisabled(path: string, method: string): boolean {
  // Import review reads its own setup metadata; this route performs no provider
  // call and still enforces the synthetic allowlist and active-budget ownership.
  if (method === 'GET' && /^\/api\/automatic-imports\/setups\/[1-9]\d*$/.test(path)) return false;
  if (disabledPrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return true;
  if ((path.startsWith('/api/admin/') && path !== '/api/admin/check') || path === '/api/admin') return true;
  if (path.startsWith('/api/invitations') && !(path === '/api/invitations/my-invitations' && method === 'GET')) return true;
  if (path.startsWith('/api/subscription/') && !(path === '/api/subscription/status' && method === 'GET')) return true;
  return /\/rentcast(?:\/|$)/.test(path) || ['/api/import/process-image', '/api/import/ai-categorize', '/api/import/ai-categorize-queued', '/api/import/get-merchant-info'].includes(path);
}
export function stagingAccessStatus(path: string, method: string, userId: string | undefined, env: GoogleCheckEnv & { STAGING_ALLOWED_USER_IDS?: string }, user?: GoogleCheckUser | null): 401 | 403 | 503 | null {
  if (env.NEXT_PUBLIC_SUPABASE_URL !== TESTING_SUPABASE_URL) return 503;
  const allowed = (env.STAGING_ALLOWED_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  if (!allowed.length || allowed.some(id => !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id))) return 503;
  if (stagingGoogleCheckEnabled(env)) {
    if (path === '/auth/callback' && method === 'GET') return null;
    if (path === '/auth/google-check' && ['GET', 'POST'].includes(method)) return !userId ? 401 : isStagingGoogleUser(user, env) ? null : 403;
    if (path === '/' && method === 'GET' && isStagingGoogleUser(user, env)) return null;
  }
  if (stagingPathDisabled(path, method)) return 503;
  if (['GET', 'HEAD'].includes(method) && publicPaths.has(path)) return null;
  if (!userId) return 401;
  return allowed.includes(userId) ? null : 403;
}
