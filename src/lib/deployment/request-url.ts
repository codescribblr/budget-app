/** Standalone Next.js sees the loopback listener as its URL origin. Redirects
 * must use the configured public origin, not that private port. Never derive
 * this origin from client-supplied forwarded headers. Vercel preview URLs and
 * local development keep their own already-public/development origins. */
export function publicRequestUrl(request: { url: string }): URL {
  const url = new URL(request.url);
  const loopback = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname);
  if (process.env.NODE_ENV !== 'development' && loopback) {
    let publicUrl: URL;
    try {
      publicUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || '');
    } catch {
      throw new Error('A public NEXT_PUBLIC_APP_URL is required for standalone redirects');
    }
    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password ||
        publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash ||
        ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(publicUrl.hostname)) {
      throw new Error('NEXT_PUBLIC_APP_URL must be a public HTTPS origin');
    }
    url.protocol = publicUrl.protocol;
    url.host = publicUrl.host;
    url.port = publicUrl.port;
  }
  return url;
}
