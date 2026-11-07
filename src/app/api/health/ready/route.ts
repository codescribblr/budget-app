import { NextResponse } from 'next/server';
import { readReleaseVersion, releaseResponseHeaders } from '@/lib/deployment/server-version';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const version = readReleaseVersion();
    if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'smoke') {
      return NextResponse.json({ status: 'ready', mode: 'smoke', dependenciesChecked: false, releaseId: version.releaseId, commitSha: version.commitSha }, { headers: releaseResponseHeaders });
    }
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (origin.protocol !== 'https:' || !key || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw Error('Configuration unavailable');
    // A bounded, read-only request confirms PostgREST and Postgres connectivity.
    // No user rows or external-service details are returned by this endpoint.
    const response = await fetch(`${origin.origin}/rest/v1/user_profiles?select=user_id&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw Error('Dependency unavailable');
    await response.body?.cancel();
    return NextResponse.json({ status: 'ready', releaseId: version.releaseId, commitSha: version.commitSha }, { headers: releaseResponseHeaders });
  } catch {
    return NextResponse.json({ status: 'not_ready' }, { status: 503, headers: releaseResponseHeaders });
  }
}
