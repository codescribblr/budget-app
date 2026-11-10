import { NextRequest, NextResponse } from 'next/server';

const probePaths = new Set(['/api/health/live', '/api/health/ready', '/api/version', '/version.json']);
const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'Retry-After': '60',
  'X-Robots-Tag': 'noindex, nofollow',
};

/** Admission control only: the database barrier and provider/job pause are separate gates. */
export function maintenanceResponse(request: NextRequest, mode: string | undefined): NextResponse | null {
  if (!mode || mode === 'off') return null;
  const read = ['GET', 'HEAD'].includes(request.method);
  if (read && probePaths.has(request.nextUrl.pathname)) return null;
  const message = 'We’re moving to our new home. Budget changes are temporarily paused. Please try again shortly.';
  if (!read || request.nextUrl.pathname.startsWith('/api/') || request.headers.get('rsc') === '1') {
    return NextResponse.json({ error: message, code: 'APP_MAINTENANCE' }, { status: 503, headers });
  }
  // No cookies/auth exchange, scripts, external assets, redirects or automatic
  // reload. Old tabs may still contain unsaved edits; do not discard them.
  return new NextResponse(request.method === 'HEAD' ? null : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maintenance · Every Dollar Budget</title><style>html{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font:18px/1.6 system-ui,sans-serif;background:#f4f7f6;color:#173b32}main{max-width:34rem;padding:2rem}p{max-width:32rem}h1{font-size:clamp(1.8rem,6vw,2.6rem);line-height:1.2}a{display:inline-block;padding:.65rem 1.15rem;background:#146b50;color:white;border-radius:.5rem;text-decoration:none}a:focus-visible{outline:3px solid #d28516;outline-offset:4px}.note{font-size:.95rem}@media(prefers-color-scheme:dark){body{background:#101e19;color:#e1eee6}a{background:#216f54}}</style></head><body><main><p>Every Dollar Budget</p><h1>We’ll be right back</h1><p>${message}</p><p class="note">If you have unsaved changes in another tab, keep that tab open until maintenance ends.</p><a href="">Try again</a></main></body></html>`, {
    status: 503,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' },
  });
}
