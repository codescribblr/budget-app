import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ server: vi.fn(), service: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.server }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: mocks.service }));
import { GET } from './route';

describe('authentication callback redirects', () => {
  let invited: boolean;
  beforeEach(() => {
    vi.resetAllMocks(); invited = false;
    vi.stubEnv('NODE_ENV', 'production');
    mocks.server.mockImplementation((_url, _key, options) => ({ auth: {
      exchangeCodeForSession: async () => {
        options.cookies.setAll([
          { name: 'sb-test-auth-token.0', value: 'synthetic-first', options: { secure: true, httpOnly: true, path: '/', sameSite: 'lax' } },
          { name: 'sb-test-auth-token.1', value: 'synthetic-second', options: { secure: true, httpOnly: true, path: '/', sameSite: 'lax' } },
        ]);
        return { data: { user: { id: 'synthetic-owner', email: 'owner@example.test' } }, error: null };
      },
    } }));
    mocks.service.mockReturnValue({ from: (table: string) => {
      const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        limit: vi.fn(async () => ({ data: table === 'account_invitations' ? (invited ? [{ token: 'synthetic-invite' }] : []) : [{ id: 74 }] })),
      };
      return query;
    } });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    ['?code=fixture', '/dashboard', false],
    ['?code=fixture&plan=premium', '/settings/subscription?checkout=premium', false],
    ['?code=fixture', '/invitations/choose', true],
  ])('keeps every session cookie on %s', async (query, path, invitation) => {
    invited = invitation;
    const response = await GET(new NextRequest(`http://127.0.0.1:3000/auth/callback${query}`, { headers: { 'x-forwarded-host': 'budget-stage.jrwdev.com' } }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com' + path);
    for (const [name, value] of [['sb-test-auth-token.0', 'synthetic-first'], ['sb-test-auth-token.1', 'synthetic-second']]) {
      expect(response.cookies.get(name)).toMatchObject({ name, value, secure: true, httpOnly: true, path: '/', sameSite: 'lax' });
    }
    if (!invitation) expect(response.cookies.get('active_account_id')?.value).toBe('74');
  });
});
