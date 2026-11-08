import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ service: vi.fn(), process: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: mocks.service }));
vi.mock('@/lib/automatic-imports/email-processor', () => ({ processEmailAttachments: mocks.process }));
import { POST } from './route';

const secretBytes = Buffer.from('synthetic-webhook-test-key-32byte!');
const secret = 'whsec_' + secretBytes.toString('base64');
const emailId = '00000000-0000-4000-8000-000000000001';
const event = { type: 'email.received', data: { email_id: emailId, to: ['setup-42@imports.example.test'] } };
function request(payload: unknown = event, age = 0, tamper = false) {
  const body = JSON.stringify(payload, null, 2);
  const timestamp = String(Math.floor(Date.now() / 1000) + age);
  const id = 'msg_synthetic';
  const signature = createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${body}`).digest('base64');
  return new Request('https://budget-stage.jrwdev.com/api/webhooks/email-import', {
    method: 'POST', body: tamper ? body + ' ' : body,
    headers: { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` },
  });
}

describe('signed inbound email imports', () => {
  let network: ReturnType<typeof vi.fn>;
  let query: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('RESEND_WEBHOOK_SECRET', secret);
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_no_network');
    vi.stubEnv('RESEND_RECEIVING_DOMAIN', 'imports.example.test');
    query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 42, account_id: 74, is_historical: true, error_count: 0 }, error: null }) };
    mocks.service.mockReturnValue({ from: vi.fn(() => query) });
    mocks.process.mockResolvedValue({ processed: 1, queued: 2, errors: [] });
    network = vi.fn(async (url: string) => {
      if (url.startsWith('https://api.resend.com/emails/receiving/')) return Response.json({ data: [{ id: 'att-1', filename: 'fixture.csv', content_type: 'text/csv', download_url: 'https://inbound-cdn.resend.com/fixture.csv' }], has_more: false });
      if (url === 'https://inbound-cdn.resend.com/fixture.csv') return new Response('date,description,amount\n2026-01-01,café,2');
      throw Error('Unexpected network destination');
    });
    vi.stubGlobal('fetch', network);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it.each([-600, 600])('rejects expired/future signatures before network or database access (%s)', async age => {
    expect((await POST(request(event, age))).status).toBe(401);
    expect(network).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('rejects modified or unsigned bytes before privileged work', async () => {
    expect((await POST(request(event, 0, true))).status).toBe(401);
    expect((await POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify(event), headers: { 'content-type': 'application/json' } }))).status).toBe(401);
    expect(network).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('fails closed without the signing secret and rejects unsigned multipart providers', async () => {
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '');
    expect((await POST(request())).status).toBe(503);
    expect((await POST(new Request('https://example.test', { method: 'POST', body: new FormData() }))).status).toBe(415);
    expect(network).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('uses verified JSON, the receiving attachment API and a stable email identity', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(network.mock.calls[0][0]).toBe(`https://api.resend.com/emails/receiving/${emailId}/attachments`);
    expect(mocks.process).toHaveBeenCalledWith(expect.objectContaining({ importSetupId: 42, accountId: 74, sourceBatchId: `email-${emailId}`, attachments: [expect.objectContaining({ filename: 'fixture.csv', content: expect.any(Buffer) })] }));
  });
  it('rejects foreign recipients and unsafe email IDs before fetching attachments', async () => {
    for (const data of [{ ...event.data, to: ['setup-42@foreign.example'] }, { ...event.data, email_id: '../sent-mail' }, { ...event.data, to: ['setup-42@imports.example.test', 'setup-43@imports.example.test'] }]) {
      expect((await POST(request({ ...event, data }))).status).toBe(400);
    }
    expect(network).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('does not acknowledge a partially downloaded or partially processed import as successful', async () => {
    network.mockImplementation(async () => new Response('', { status: 503 }));
    expect((await POST(request())).status).toBe(502);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it('does not process earlier attachments when a later download fails', async () => {
    network.mockImplementation(async (url: string) => {
      if (url.startsWith('https://api.resend.com/')) return Response.json({ data: ['first', 'second'].map(id => ({ id, filename: id + '.csv', content_type: 'text/csv', download_url: 'https://inbound-cdn.resend.com/' + id })), has_more: false });
      return new Response('fixture', { status: url.endsWith('first') ? 200 : 503 });
    });
    expect((await POST(request())).status).toBe(502);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it('follows receiving-attachment pagination without dropping later pages', async () => {
    network.mockImplementation(async (url: string) => {
      if (url.startsWith('https://api.resend.com/')) {
        const second = url.includes('after=first'); const id = second ? 'second' : 'first';
        return Response.json({ data: [{ id, filename: id + '.csv', content_type: 'text/csv', download_url: 'https://inbound-cdn.resend.com/' + id }], has_more: !second });
      }
      return new Response('fixture');
    });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.process.mock.calls[0][0].attachments).toHaveLength(2);
  });
  it('returns a failure when processing fails so the provider can retry', async () => {
    mocks.process.mockResolvedValue({ processed: 1, queued: 0, errors: ['Fixture parse failure'] });
    const response = await POST(request());
    expect(response.status).toBe(500); expect((await response.json()).success).toBe(false);
  });
  it('does not download attachments for an inactive setup', async () => {
    query.single.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(404);
    expect(network).not.toHaveBeenCalled();
  });
});
