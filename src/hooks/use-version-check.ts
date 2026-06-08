'use client';

import { useEffect, useState, useRef } from 'react';

interface VersionInfo {
  buildTime: string;
  buildTimestamp: number;
}

const CHECK_INTERVAL = 60000; // Check every 60 seconds
const INITIAL_DELAY = 30000; // Wait 30 seconds before first check

/**
 * Hook to check for new app versions
 * Compares the current loaded version with the server version
 */
export function useVersionCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const currentVersionRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get initial version on mount
    const getInitialVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
        });
        if (response.ok) {
          const version: VersionInfo = await response.json();
          currentVersionRef.current = version.buildTimestamp;
        }
      } catch (error) {
        // Silently handle errors - version check is non-critical
        // Network errors, API unavailability, etc. are expected in some scenarios
        if (process.env.NODE_ENV === 'development') {
          console.debug('Version check unavailable:', error);
        }
      }
    };

    getInitialVersion();

    const checkVersion = async () => {
      // Skip check if we already know there's an update
      if (hasUpdate) return;

      setIsChecking(true);
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          try {
            const version: VersionInfo = await response.json();
            
            // Compare with current version
            if (
              currentVersionRef.current !== null &&
              version.buildTimestamp > currentVersionRef.current
            ) {
              setHasUpdate(true);
              // Clear interval once update is detected
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }
          } catch (parseError) {
            // Silently handle JSON parsing errors
            if (process.env.NODE_ENV === 'development') {
              console.debug('Error parsing version response:', parseError);
            }
          }
        }
      } catch (error) {
        // Silently handle network errors - version check is non-critical
        // Network errors, API unavailability, etc. are expected in some scenarios
        if (process.env.NODE_ENV === 'development') {
          console.debug('Version check failed:', error);
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Start checking after initial delay
    const timeoutId = setTimeout(() => {
      // Check immediately
      checkVersion();

      // Then check periodically
      intervalRef.current = setInterval(checkVersion, CHECK_INTERVAL);
    }, INITIAL_DELAY);

    // Check when window regains focus (user switches back to tab)
    const handleFocus = () => {
      if (!hasUpdate) {
        checkVersion();
      }
    };

    // Check when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && !hasUpdate) {
        checkVersion();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUpdate]);

  const refreshPage = () => {
    window.location.reload();
  };

  return {
    hasUpdate,
    isChecking,
    refreshPage,
  };
}
