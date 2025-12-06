'use client';

import { useState, useEffect } from 'react';
import { getRandomLoadingMessage } from '@/lib/ai/loading-messages';

/**
 * Hook to get rotating loading messages
 * @param intervalMs - How often to rotate messages (default: 5000ms)
 * @param enabled - Whether rotation is enabled (default: true)
 */
export function useRotatingLoadingMessage(
  intervalMs: number = 5000,
  enabled: boolean = true
): string {
  const [message, setMessage] = useState(() => getRandomLoadingMessage());

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setMessage(getRandomLoadingMessage());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, enabled]);

  return message;
}

