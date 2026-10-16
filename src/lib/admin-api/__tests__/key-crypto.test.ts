import { describe, expect, it } from 'vitest';
import {
  generateAdminApiKeySecret,
  getAdminApiKeyPrefix,
  hashAdminApiKey,
  verifyAdminApiKey,
} from '../key-crypto';

describe('admin api key crypto', () => {
  it('generates adm_ prefixed secrets and stable SHA-256 hashes', () => {
    const secret = generateAdminApiKeySecret();
    expect(secret.startsWith('adm_')).toBe(true);
    const prefix = getAdminApiKeyPrefix(secret);
    expect(prefix).toHaveLength(16);
    expect(secret.startsWith(prefix)).toBe(true);

    const hash = hashAdminApiKey(secret);
    expect(hash).toHaveLength(64);
    expect(verifyAdminApiKey(secret, hash)).toBe(true);
    expect(verifyAdminApiKey(secret + 'x', hash)).toBe(false);
  });
});
