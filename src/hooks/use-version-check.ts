'use client';
import { useEffect, useState } from 'react';
import { releaseHasChanged, isReleaseVersion } from '@/lib/deployment/release-identity';
import { hasUnsavedChanges } from '@/lib/deployment/unsaved-changes';
const LOADED_RELEASE = process.env.NEXT_PUBLIC_RELEASE_ID;
export function useVersionCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    let stopped = false;
    let controller: AbortController | undefined;
    const check = async () => {
      if (controller || document.hidden) return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);
      setIsChecking(true);
      try {
        const response = await fetch('/api/version', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal });
        if (response.ok) {
          const remote: unknown = await response.json();
          if (!stopped && isReleaseVersion(remote)) setHasUpdate(releaseHasChanged(LOADED_RELEASE, remote));
        }
      } catch { /* Offline/error responses never invent a release. */ }
      finally { clearTimeout(timeout); controller = undefined; if (!stopped) setIsChecking(false); }
    };
    // Compare with the identity baked into this JavaScript, including the first fetch.
    void check();
    const interval = setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { stopped = true; controller?.abort(); clearInterval(interval); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, []);
  const refreshPage = () => {
    if (hasUnsavedChanges()) return false;
    if (!window.confirm('Refresh the app now? Save any changes first. Unsaved edits will be lost.')) return false;
    window.location.reload();
    return true;
  };
  return { hasUpdate, isChecking, refreshPage };
}
