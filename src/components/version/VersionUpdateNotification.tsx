'use client';

import { useVersionCheck } from '@/hooks/use-version-check';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { hasUnsavedChanges } from '@/lib/deployment/unsaved-changes';
import { usePathname } from 'next/navigation';

/**
 * Component that displays a notification when a new version is available
 * Shows a banner at the bottom of the screen prompting user to refresh
 */
export function VersionUpdateNotification() {
  const pathname = usePathname();
  const isNewLook = pathname === '/new' || pathname.startsWith('/new/');
  const { hasUpdate, refreshPage } = useVersionCheck();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blockedRefresh, setBlockedRefresh] = useState(false);
  useEffect(() => { setIsVisible(hasUpdate && !isDismissed); }, [hasUpdate, isDismissed]);
  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Re-check after 5 minutes
    dismissTimer.current = setTimeout(() => {
      setIsDismissed(false);
    }, 5 * 60 * 1000);
  };

  const handleRefresh = () => {
    if (isRefreshing) return; // Prevent multiple clicks
    
    setBlockedRefresh(hasUnsavedChanges());
    if (refreshPage()) {
      setIsRefreshing(true);
      // A browser beforeunload guard can cancel navigation after reload is requested.
      setTimeout(() => setIsRefreshing(false), 1500);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 ${isNewLook ? 'new-look nl-version-notice' : ''}`}>
      <div className={isNewLook ? 'nl-version-position' : 'mx-auto max-w-7xl px-4 pb-4'}>
        <div className={isNewLook ? 'nl-version-card' : 'flex items-center justify-between gap-4 rounded-lg border bg-background p-4 shadow-lg'}>
          <div className={isNewLook ? 'nl-version-message' : 'flex items-center gap-3'}>
            <span className={isNewLook ? 'nl-version-icon' : 'flex shrink-0'} aria-hidden="true">
              <RefreshCw className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </span>
            <div role="status">
              <p className="font-medium">New version available</p>
              <p className="text-sm text-muted-foreground">
                {blockedRefresh ? 'Save or discard your edits before refreshing.' : 'Save your work, then refresh to load the available version.'}
              </p>
            </div>
          </div>
          <div className={isNewLook ? 'nl-version-actions' : 'flex items-center gap-2'}>
            <Button
              onClick={handleRefresh}
              size="sm"
              className={isNewLook ? 'nl-primary shrink-0' : 'shrink-0'}
              disabled={isRefreshing}
            >
              {!isNewLook && <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className={isNewLook ? 'nl-version-dismiss' : 'h-8 w-8 p-0'}
              aria-label="Dismiss update notice"
              disabled={isRefreshing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
