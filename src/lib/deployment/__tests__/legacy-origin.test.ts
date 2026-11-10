import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { legacyOriginResponse } from '../legacy-origin';
const target = 'https://everydollarbudget.app';
const request = (path: string, method = 'GET') => new NextRequest(`https://budget-app-one-lime.vercel.app${path}`, { method, headers: { Cookie: 'private-cookie', Authorization: 'private-token' } });
const version = { releaseId: 'release-current', commitSha: 'a'.repeat(40), buildTime: '2026-11-07T00:00:00Z', buildTimestamp: 1000 };
describe('retiring-origin transition', () => {
  it('stays inactive unless explicitly configured', async () => { expect(await legacyOriginResponse(request('/login'), undefined)).toBeNull(); });
  it('redirects page requests with their path and query', async () => {
    const r = await legacyOriginResponse(request('/transactions?month=2026-11'), target);
    expect(r?.status).toBe(307);
    const location = new URL(r!.headers.get('location')!);
    expect(location.origin).toBe(target);
    expect(location.pathname).toBe('/transactions');
    expect(location.searchParams.get('month')).toBe('2026-11');
    expect(location.searchParams.get('__budget_move')).toMatch(/^[0-9a-f-]{36}$/);
    expect(r?.headers.get('cache-control')).toContain('no-store');
  });
  it('uses a fresh canonical URI even if a prior migration URL was cached', async () => {
    const path = '/transactions?month=2026-11&__budget_move=old-cached-value';
    const first = (await legacyOriginResponse(request(path), target))!.headers.get('location')!;
    const second = (await legacyOriginResponse(request(path), target))!.headers.get('location')!;
    expect(first).not.toBe(second);
    expect(first).not.toContain('old-cached-value');
    expect(new URL(first).searchParams.get('month')).toBe('2026-11');
  });
  it('restarts old-origin sign-in without forwarding one-time credentials', async () => {
    const response = await legacyOriginResponse(request('/auth/callback?code=one-time-code&next=https://attacker.invalid'), target);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.size).toBe(1);
    expect(location.searchParams.has('__budget_move')).toBe(true);
    expect(response!.headers.get('referrer-policy')).toBe('no-referrer');
  });
  it('does not replay API writes or server actions across hosts', async () => {
    for (const [path, method] of [['/api/transactions', 'POST'], ['/api/accounts', 'GET'], ['/login', 'POST']]) {
      const r = await legacyOriginResponse(request(path, method), target); expect(r?.status).toBe(503); expect(r?.headers.get('location')).toBeNull();
    }
  });
  it('proxies only the public release identity without user credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(version));
    const r = await legacyOriginResponse(request('/api/version'), target, fetcher);
    expect(await r?.json()).toEqual(version); expect(fetcher.mock.calls[0][0].href).toBe(target + '/api/version');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error', cache: 'no-store' }); expect(fetcher.mock.calls[0][1].headers).toBeUndefined();
  });
  it('fails closed for invalid destinations, redirect loops and bad release responses', async () => {
    expect((await legacyOriginResponse(request('/'), 'https://attacker.invalid'))?.status).toBe(503);
    expect((await legacyOriginResponse(new NextRequest(target), target))?.status).toBe(503);
    expect((await legacyOriginResponse(request('/api/version'), target, vi.fn().mockResolvedValue(Response.json({ buildTimestamp: 10 }))))?.status).toBe(503);
  });
});
