import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { getApiKeyPrefix } from './scopes';

const SCRYPT_KEYLEN = 64;

export function generateApiKeySecret(): string {
  const prefix = getApiKeyPrefix();
  const secret = randomBytes(32).toString('base64url');
  return `${prefix}${secret}`;
}

export function getKeyPrefix(fullKey: string): string {
  return fullKey.slice(0, 20);
}

export function hashApiKey(fullKey: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(fullKey, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyApiKey(fullKey: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const computed = scryptSync(fullKey, salt, SCRYPT_KEYLEN).toString('hex');

  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  } catch {
    return false;
  }
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}
