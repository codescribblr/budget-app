import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyTellerSignature } from '../teller-signature';

const now = 1_793_000_000;
const secret = 'synthetic-teller-test-secret';
const body = '{\n  "type": "webhook.test", "payload": {"note":"café"}\n}';
const sign = (timestamp = now, input = body) => createHmac('sha256', secret).update(`${timestamp}.${input}`).digest('hex');

describe('Teller signature contract', () => {
  it('accepts original UTF-8 bytes and either valid rotation signature', () => {
    const other = '0'.repeat(64);
    for (const signatures of [`v1=${sign()}`, `v1=${other},v1=${sign()}`, `v1=${sign()},v1=${other}`]) {
      expect(verifyTellerSignature(body, `t=${now},${signatures}`, secret, now)).toBe(true);
    }
  });
  it('rejects altered bodies, ambiguous timestamps, malformed signatures and missing secrets', () => {
    expect(verifyTellerSignature(JSON.stringify(JSON.parse(body)), `t=${now},v1=${sign()}`, secret, now)).toBe(false);
    for (const header of [null, `t=${now},t=${now},v1=${sign()}`, `t=${now},v1=abc`, `prefix-t=${now},v1=${sign()}`, `t=${now},v1=${'0'.repeat(64)}`]) {
      expect(verifyTellerSignature(body, header, secret, now)).toBe(false);
    }
    expect(verifyTellerSignature(body, `t=${now},v1=${sign()}`, '', now)).toBe(false);
  });
  it('rejects old and future signatures outside the three-minute window', () => {
    for (const offset of [-181, 181]) {
      expect(verifyTellerSignature(body, `t=${now + offset},v1=${sign(now + offset)}`, secret, now)).toBe(false);
    }
    for (const offset of [-180, 180]) {
      expect(verifyTellerSignature(body, `t=${now + offset},v1=${sign(now + offset)}`, secret, now)).toBe(true);
    }
  });
});
