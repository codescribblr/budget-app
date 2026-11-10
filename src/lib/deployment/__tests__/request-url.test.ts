import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicRequestUrl } from '../request-url';

afterEach(() => vi.unstubAllEnvs());

describe('public redirect URLs behind the standalone proxy', () => {
  it.each(['http://127.0.0.1:38569', 'https://localhost:38569', 'http://[::1]:3000'])('replaces %s without losing the path or query', origin => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://budget-stage.jrwdev.com');
    expect(publicRequestUrl({ url: origin + '/transactions?search=coffee' }).href)
      .toBe('https://budget-stage.jrwdev.com/transactions?search=coffee');
  });
  it('keeps a Vercel preview on its own origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://everydollarbudget.app');
    const url = 'https://budget-preview.vercel.app/login';
    expect(publicRequestUrl({ url }).href).toBe(url);
  });
  it('keeps local development on its selected port', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://everydollarbudget.app');
    expect(publicRequestUrl({ url: 'http://localhost:3001/login' }).href).toBe('http://localhost:3001/login');
  });
  it.each(['', 'https://localhost:3000', 'http://budget-stage.jrwdev.com', 'https://user:password@budget-stage.jrwdev.com', 'https://budget-stage.jrwdev.com/path'])('rejects a missing or invalid public origin', configured => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', configured);
    expect(() => publicRequestUrl({ url: 'http://127.0.0.1:3000/login' })).toThrow();
  });
});
