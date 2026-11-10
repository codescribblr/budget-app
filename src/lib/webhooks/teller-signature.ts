import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verify the original bytes and every v1 signature supplied during rotation. */
export function verifyTellerSignature(body: string, header: string | null, secret: string, now = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret.trim()) return false;
  const parts = header.split(',').map(part => part.trim());
  const timestamps = parts.filter(part => part.startsWith('t='));
  if (timestamps.length !== 1 || !/^t=\d+$/.test(timestamps[0])) return false;
  const timestamp = timestamps[0].slice(2);
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(now - seconds) > 180) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  return parts.some(part => {
    if (!/^v1=[a-f\d]{64}$/i.test(part)) return false;
    return timingSafeEqual(expected, Buffer.from(part.slice(3), 'hex'));
  });
}
