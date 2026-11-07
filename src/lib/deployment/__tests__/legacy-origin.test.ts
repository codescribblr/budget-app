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
    expect(r?.status).toBe(307); expect(r?.headers.get('location')).toBe(`${target}/transactions?month=2026-11`); expect(r?.headers.get('cache-control')).toContain('no-store');
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
