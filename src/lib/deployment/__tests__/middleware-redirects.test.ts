import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const auth = vi.hoisted(() => ({ user: null as null | { id: string; email?: string; email_confirmed_at?: string; identities?: { provider: string }[] }, refresh: false }));
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string }[]) => void } }) => ({
  auth: { getUser: async () => {
    if (auth.refresh) options.cookies.setAll([{ name: 'test-session', value: 'refreshed' }]);
    return { data: { user: auth.user } };
  } },
}) }));
import { middleware } from '@/middleware';

beforeEach(() => {
  auth.user = null;
  auth.refresh = false;
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://budget-stage.jrwdev.com');
  vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', '');
  vi.stubEnv('LEGACY_HOST_REDIRECT', '');
  vi.stubEnv('APP_MAINTENANCE_MODE', '');
  vi.stubEnv('NEXT_PUBLIC_STAGING_GOOGLE_CHECK', '');
  vi.stubEnv('STAGING_GOOGLE_AUTH_EMAILS', '');
});

describe('staging Google confirmation isolation', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://nmqlddimigebtlaophbv.supabase.co');
    vi.stubEnv('STAGING_ALLOWED_USER_IDS', '00000000-0000-4000-8000-000000000001');
    vi.stubEnv('NEXT_PUBLIC_STAGING_GOOGLE_CHECK', '1');
    vi.stubEnv('STAGING_GOOGLE_AUTH_EMAILS', 'operator@example.com');
    auth.user = { id: '00000000-0000-4000-8000-000000000002', email: 'operator@example.com', email_confirmed_at: '2026-11-09', identities: [{ provider: 'google' }] };
  });
  it.each(['/', '/login'])('redirects %s to confirmation with refreshed cookies', async path => {
    auth.refresh = true;
    const response = await middleware(new NextRequest('http://localhost:38569' + path));
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com/auth/google-check');
    expect(response.cookies.get('test-session')?.value).toBe('refreshed');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it.each(['/dashboard', '/new', '/api/transactions'])('denies budget access to %s', async path => {
    const response = await middleware(new NextRequest('http://localhost:38569' + path));
    expect(response.status).toBe(403);
  });
  it('rejects an unapproved Google account at confirmation', async () => {
    auth.user!.email = 'unapproved@example.com';
    const response = await middleware(new NextRequest('http://localhost:38569/auth/google-check'));
    expect(response.status).toBe(403);
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('standalone authentication redirects', () => {
  it('opens the public staging login for a signed-out homepage visit', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://nmqlddimigebtlaophbv.supabase.co');
    vi.stubEnv('STAGING_ALLOWED_USER_IDS', '00000000-0000-4000-8000-000000000001');
    const response = await middleware(new NextRequest('https://localhost:38569/'));
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com/login');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it.each(['/transactions?search=coffee', '/admin/users?tab=all', '/invitations/choose'])('retains the return path for %s', async path => {
    const response = await middleware(new NextRequest('https://localhost:38569' + path));
    const target = new URL(response.headers.get('location')!);
    expect(target.origin).toBe('https://budget-stage.jrwdev.com');
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('redirectTo')).toBe(path);
  });
  it.each(['/', '/login', '/signup'])('returns an authenticated visitor from %s to their selected interface', async path => {
    auth.user = { id: 'synthetic-user' };
    const response = await middleware(new NextRequest('https://localhost:38569' + path, { headers: { cookie: 'budget-interface=new', 'x-forwarded-host': 'attacker.example' } }));
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com/new');
  });
});


describe('maintenance middleware precedence', () => {
  it('blocks a callback before session exchange and before old-host redirect', async () => {
    vi.stubEnv('APP_MAINTENANCE_MODE', 'on');
    vi.stubEnv('LEGACY_HOST_REDIRECT', 'https://everydollarbudget.app');
    auth.refresh = true;
    const response = await middleware(new NextRequest('https://budget-stage.jrwdev.com/auth/callback?code=private'));
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });
});
