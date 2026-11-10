export interface ReleaseVersion {
  releaseId: string;
  commitSha: string;
  buildTime: string;
  buildTimestamp: number;
}
export function isReleaseVersion(value: unknown): value is ReleaseVersion {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ReleaseVersion>;
  return typeof v.releaseId === 'string' && /^[a-z0-9][a-z0-9_-]{7,127}$/.test(v.releaseId)
    && typeof v.commitSha === 'string' && /^[a-f0-9]{40}$/.test(v.commitSha)
    && typeof v.buildTime === 'string' && Number.isFinite(Date.parse(v.buildTime))
    && typeof v.buildTimestamp === 'number' && Number.isFinite(v.buildTimestamp) && v.buildTimestamp > 0;
}
export function releaseHasChanged(loadedRelease: string | undefined, remote: unknown): boolean {
  return !!loadedRelease && isReleaseVersion(remote) && remote.releaseId !== loadedRelease;
}
