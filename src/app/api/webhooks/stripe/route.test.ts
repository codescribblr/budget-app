import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const service = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: service }));
vi.mock('@/lib/premium-feature-setup', () => ({ setupPremiumFeatures: vi.fn() }));
vi.mock('@/lib/notifications/subscription-helpers', () => ({ createPaymentFailedNotification: vi.fn() }));
vi.mock('@/lib/subscription-access-control', () => ({ disablePremiumAccess: vi.fn() }));
vi.mock('@/lib/subscription-price-utils', () => ({ getPriceInfoFromStripe: vi.fn() }));
import { POST } from './route';

const secret = 'whsec_synthetic_signature_contract';
const body = '{\n "id":"evt_fixture", "type":"synthetic.test", "data":{"object":{"note":"café"}}\n}';
const stripe = new Stripe('sk_test_synthetic_no_network');
const sign = (timestamp = Math.floor(Date.now() / 1000)) => stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });
function request(payload: string, signature?: string) {
  return new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: payload, headers: signature ? { 'stripe-signature': signature } : {} });
}
describe('Stripe raw-body verification', () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic_no_network'); vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret);
    vi.spyOn(console, 'error').mockImplementation(() => {}); service.mockReturnValue({});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it('accepts the original payload and rejects normalization or expiry before database access', async () => {
    expect((await POST(request(body, sign()))).status).toBe(200);
    service.mockClear();
    expect((await POST(request(JSON.stringify(JSON.parse(body)), sign()))).status).toBe(400);
    expect((await POST(request(body, sign(Math.floor(Date.now() / 1000) - 600)))).status).toBe(400);
    expect(service).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('café');
  });
  it('requires the signature and configured secret', async () => {
    expect((await POST(request(body))).status).toBe(401);
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect((await POST(request(body, sign()))).status).toBe(500);
    expect(service).not.toHaveBeenCalled();
  });
});
