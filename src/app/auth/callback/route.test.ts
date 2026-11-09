import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ server: vi.fn(), service: vi.fn(), signOut: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.server }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: mocks.service }));
import { GET } from './route';

describe('authentication callback redirects', () => {
  let invited: boolean;
  let callbackUser: {id:string;email:string;email_confirmed_at?:string;identities?:{provider:string}[]};
  beforeEach(() => {
    vi.resetAllMocks(); invited = false;
    callbackUser={id:'synthetic-owner',email:'owner@example.test'};
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://budget-stage.jrwdev.com');
    mocks.server.mockImplementation((_url, _key, options) => ({ auth: {
      exchangeCodeForSession: async () => {
        options.cookies.setAll([
          { name: 'sb-test-auth-token.0', value: 'synthetic-first', options: { secure: true, httpOnly: true, path: '/', sameSite: 'lax' } },
          { name: 'sb-test-auth-token.1', value: 'synthetic-second', options: { secure: true, httpOnly: true, path: '/', sameSite: 'lax' } },
        ]);
        return { data: { user: callbackUser }, error: null };
      },
      signOut:mocks.signOut,
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
    const response = await GET(new NextRequest(`http://127.0.0.1:3000/auth/callback${query}`, { headers: { 'x-forwarded-host': 'attacker.example' } }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com' + path);
    for (const [name, value] of [['sb-test-auth-token.0', 'synthetic-first'], ['sb-test-auth-token.1', 'synthetic-second']]) {
      expect(response.cookies.get(name)).toMatchObject({ name, value, secure: true, httpOnly: true, path: '/', sameSite: 'lax' });
    }
    if (!invitation) expect(response.cookies.get('active_account_id')?.value).toBe('74');
  });
  it('keeps failed authentication on the public origin', async () => {
    const response = await GET(new NextRequest('http://127.0.0.1:3000/auth/callback', { headers: { 'x-forwarded-host': 'attacker.example' } }));
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com/auth/auth-code-error');
  });
  it('stops the approved staging Google callback before any budget or invitation work',async()=>{
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE','staging');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://nmqlddimigebtlaophbv.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_STAGING_GOOGLE_CHECK','1');
    vi.stubEnv('STAGING_GOOGLE_AUTH_EMAILS','operator@example.test');
    callbackUser={id:'google-operator',email:'operator@example.test',email_confirmed_at:'2026-11-09',identities:[{provider:'google'}]};
    const response=await GET(new NextRequest('http://127.0.0.1:3000/auth/callback?code=fixture&plan=premium&next=%2Finvite%2Ffixture'));
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com/auth/google-check');
    expect(response.cookies.get('sb-test-auth-token.0')?.value).toBe('synthetic-first');
    expect(response.cookies.get('active_account_id')).toBeUndefined();
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('rejects a non-approved staging identity before privileged database access',async()=>{
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE','staging');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://nmqlddimigebtlaophbv.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_STAGING_GOOGLE_CHECK','1');
    vi.stubEnv('STAGING_GOOGLE_AUTH_EMAILS','operator@example.test');
    const response=await GET(new NextRequest('http://127.0.0.1:3000/auth/callback?code=fixture'));
    expect(response.headers.get('location')).toBe('https://budget-stage.jrwdev.com/login?google_check=denied');
    expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it('fails closed before code exchange when staging auth checks are disabled',async()=>{
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE','staging');
    vi.stubEnv('NEXT_PUBLIC_STAGING_GOOGLE_CHECK','');
    const response=await GET(new NextRequest('http://127.0.0.1:3000/auth/callback?code=fixture'));
    expect(response.status).toBe(503);expect(mocks.server).not.toHaveBeenCalled();expect(mocks.service).not.toHaveBeenCalled();
  });
});
