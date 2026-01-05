'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push-notifications';

/**
 * Service Worker Provider
 * Registers the service worker when the app loads
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on mount
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker().catch((error) => {
        console.error('Failed to register service worker:', error);
      });
    }
  }, []);

  return <>{children}</>;
}


