import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isStagingGoogleUser, stagingGoogleCheckEnabled } from '@/lib/deployment/staging-google';
import { publicRequestUrl } from '@/lib/deployment/request-url';

const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};
function unavailable() { return new NextResponse(null, { status: 404, headers }); }
const escapeHTML = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export async function GET() {
  if (!stagingGoogleCheckEnabled(process.env)) return unavailable();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isStagingGoogleUser(user, process.env)) return new NextResponse(null, { status: user ? 403 : 401, headers });
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google sign-in verified</title><style>body{font:18px/1.6 system-ui;margin:0;background:#f3f6f9;color:#172533}main{max-width:36rem;margin:12vh auto;padding:2rem}h1{line-height:1.2}button{font:inherit;padding:.6rem 1rem;border:0;border-radius:.5rem;background:#163d2c;color:white;cursor:pointer}code{overflow-wrap:anywhere}@media(prefers-color-scheme:dark){body{background:#14202b;color:#eef4f8}button{background:#b9efd3;color:#14202b}}</style></head><body><main><p>Every Dollar Budget · Staging</p><h1>Google sign-in verified</h1><p>You signed in as <strong>${escapeHTML(user!.email!)}</strong>.</p><p>Your session is working on this staging domain. You can reload this page to check that it remains signed in.</p><p>This check ends here. Budget access is reserved for the synthetic test accounts.</p><form method="post" action="/auth/google-check"><button type="submit">Sign out of this test</button></form></main></body></html>`, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(request: NextRequest) {
  if (!stagingGoogleCheckEnabled(process.env)) return unavailable();
  const origin = publicRequestUrl(request).origin;
  if (request.headers.get('origin') !== origin) return new NextResponse(null, { status: 403, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isStagingGoogleUser(user, process.env)) return new NextResponse(null, { status: user ? 403 : 401, headers });
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) return NextResponse.json({ error: 'Sign out failed. Please try again.' }, { status: 503, headers });
  return NextResponse.redirect(new URL('/login', origin), { status: 303, headers });
}
