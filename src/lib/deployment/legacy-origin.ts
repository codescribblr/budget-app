import { NextRequest, NextResponse } from 'next/server';
import { isReleaseVersion } from './release-identity';
const headers = { 'Cache-Control': 'no-store, max-age=0', 'Retry-After': '60' };
/** Explicitly enabled only on the retiring Vercel origin after public routing changes. */
export async function legacyOriginResponse(request: NextRequest, configuredTarget: string | undefined, fetcher: typeof fetch = fetch): Promise<NextResponse | null> {
  if (!configuredTarget) return null;
  let target: URL;
  try {
    target = new URL(configuredTarget);
    // This application's verified canonical origin, never a request parameter.
    if (target.origin !== 'https://everydollarbudget.app' || target.pathname !== '/' || target.search || target.hash || target.username || target.password || request.nextUrl.hostname === target.hostname) throw Error('Invalid migration target');
  } catch {
    return NextResponse.json({ error: 'Hosting transition configuration is unavailable.' }, { status: 503, headers });
  }
  if (['/api/version', '/version.json'].includes(request.nextUrl.pathname) && ['GET', 'HEAD'].includes(request.method)) {
    try {
      // No user cookies or authorization are forwarded to this public probe.
      const response = await fetcher(new URL('/api/version', target), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw Error('New origin unavailable');
      const version: unknown = await response.json();
      if (!isReleaseVersion(version)) throw Error('New origin version invalid');
      return NextResponse.json(version, { headers });
    } catch {
      return NextResponse.json({ error: 'The new release is temporarily unavailable.' }, { status: 503, headers });
    }
  }
  // A redirect must not replay a server action or financial mutation on another
  // host. Old tabs can save before cutover; after cutover they must refresh.
  if (request.nextUrl.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
    return NextResponse.json({ error: 'The app has moved. Refresh the page to continue.', migrationTarget: target.origin }, { status: 503, headers });
  }
  target.pathname = request.nextUrl.pathname;
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, { status: 307, headers });
}
