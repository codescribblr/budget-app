import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export type AdminApiKeyEnvPrefix = 'adm_live_' | 'adm_test_';

export function getAdminApiKeyEnvPrefix(): AdminApiKeyEnvPrefix {
  return process.env.NODE_ENV === 'production' ? 'adm_live_' : 'adm_test_';
}

/** Full secret shown once: adm_live_<base64url> */
export function generateAdminApiKeySecret(): string {
  const envPrefix = getAdminApiKeyEnvPrefix();
  const secret = randomBytes(32).toString('base64url');
  return `${envPrefix}${secret}`;
}

/** Visible lookup prefix (first 16 chars). */
export function getAdminApiKeyPrefix(fullKey: string): string {
  return fullKey.slice(0, 16);
}

/** SHA-256 hex digest of the full secret (no salt; key entropy is high). */
export function hashAdminApiKey(fullKey: string): string {
  return createHash('sha256').update(fullKey, 'utf8').digest('hex');
}

export function verifyAdminApiKey(fullKey: string, storedHash: string): boolean {
  const computed = hashAdminApiKey(fullKey);
  try {
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}
