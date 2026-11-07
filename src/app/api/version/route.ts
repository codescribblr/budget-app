import { NextResponse } from 'next/server';
import { readReleaseVersion, releaseResponseHeaders } from '@/lib/deployment/server-version';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json(readReleaseVersion(), { headers: releaseResponseHeaders }); }
  catch { return NextResponse.json({ error: 'Release manifest unavailable' }, { status: 503, headers: releaseResponseHeaders }); }
}
