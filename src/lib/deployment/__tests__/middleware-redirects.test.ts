import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({
  auth: { getUser: async () => ({ data: { user: auth.user } }) },
}) }));
import { middleware } from '@/middleware';

beforeEach(() => {
  auth.user = null;
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://budget-stage.jrwdev.com');
  vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', '');
  vi.stubEnv('LEGACY_HOST_REDIRECT', '');
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
