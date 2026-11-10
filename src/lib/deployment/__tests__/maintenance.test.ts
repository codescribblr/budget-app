import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { maintenanceResponse } from '../maintenance';
const request = (path: string, method = 'GET', headers = {}) => new NextRequest('https://budget-stage.jrwdev.com' + path, { method, headers });
describe('maintenance request admission', () => {
  it.each([undefined, '', 'off'])('leaves normal operation unchanged with %s', mode => {
    expect(maintenanceResponse(request('/api/transactions', 'POST'), mode)).toBeNull();
  });
  it.each(['on', '1', 'typo'])('fails closed for an enabled or unknown mode %s', async mode => {
    const response = maintenanceResponse(request('/new?search=coffee'), mode)!;
    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('set-cookie')).toBeNull();
    const html = await response.text();
    expect(html).toContain('keep that tab open');
    expect(html).not.toContain('script');
  });
  it.each(['/api/health/live', '/api/health/ready', '/api/version', '/version.json'])('keeps only safe probes at %s', async path => {
    expect(maintenanceResponse(request(path), 'on')).toBeNull();
    expect(maintenanceResponse(request(path, 'HEAD'), 'on')).toBeNull();
    expect(maintenanceResponse(request(path, 'POST'), 'on')?.status).toBe(503);
  });
  it.each([['/api/webhooks/stripe','POST'],['/api/cron/scheduled-jobs','GET'],['/new','POST'],['/api/accounts/a.png','PATCH'],['/api/transactions','GET']])('rejects %s %s without redirecting or acknowledging work', async (path,method) => {
    const response = maintenanceResponse(request(path,method),'on')!;
    expect(response.status).toBe(503);
    expect(response.headers.get('location')).toBeNull();
    expect((await response.json()).code).toBe('APP_MAINTENANCE');
  });
  it('does not inject HTML into client navigation or reflect request input', async () => {
    const response = maintenanceResponse(request('/new?x=<script>', 'GET', { rsc: '1' }), 'on')!;
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.text()).not.toContain('<script>');
  });
  it('returns no page body for HEAD and stops auth callbacks', async () => {
    expect(await maintenanceResponse(request('/login','HEAD'),'on')!.text()).toBe('');
    expect(maintenanceResponse(request('/auth/callback?code=private'),'on')?.status).toBe(503);
  });
});
