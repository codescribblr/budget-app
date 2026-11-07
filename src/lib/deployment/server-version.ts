import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isReleaseVersion, type ReleaseVersion } from './release-identity';
export function readReleaseVersion(): ReleaseVersion {
  const value: unknown = JSON.parse(readFileSync(join(process.cwd(), 'public/version.json'), 'utf8'));
  if (!isReleaseVersion(value)) throw new Error('Release manifest unavailable');
  const expected = process.env.RELEASE_ID || process.env.NEXT_PUBLIC_RELEASE_ID;
  if (expected && expected !== 'development' && value.releaseId !== expected) throw new Error('Release identity mismatch');
  if (process.env.RELEASE_COMMIT_SHA && process.env.RELEASE_COMMIT_SHA !== value.commitSha) throw new Error('Release commit mismatch');
  return value;
}
export const releaseResponseHeaders = { 'Cache-Control': 'no-store, max-age=0', 'Pragma': 'no-cache' };
