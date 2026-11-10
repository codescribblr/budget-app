import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/deployment/server-version', () => ({
  readReleaseVersion: () => ({ releaseId: 'test-release', commitSha: 'a'.repeat(40) }),
  releaseResponseHeaders: { 'Cache-Control': 'no-store' },
}));
import { GET } from '@/app/api/health/ready/route';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('release readiness with replacement Supabase credentials', () => {
  function configure(key: string) {
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);
  }
  it.each(['sb_secret_test-private', 'legacy-service-jwt'])('uses a bounded row-free probe for %s', async key => {
    configure(key);
    const fetcher = vi.fn().mockResolvedValue(new Response('[]'));
    vi.stubGlobal('fetch', fetcher);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ready', releaseId: 'test-release' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/user_profiles?select=user_id&limit=0');
    expect(options.headers).toEqual(key.startsWith('sb_secret_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` });
    expect(options.redirect).toBe('error');
    expect(options.cache).toBe('no-store');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([401, 403, 500])('rejects a failed dependency without exposing credentials (%i)', async status => {
    configure('sb_secret_private');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('sb_secret_private', { status })));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'not_ready' });
  });
});
