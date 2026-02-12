'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useFeature } from '@/contexts/FeatureContext';
import type { FeatureName } from '@/lib/feature-flags';

const STORAGE_PREFIX = 'feature-teaser-dismissed-';

interface FeatureTeaserProps {
  /** Unique key for localStorage (e.g. 'income-buffer') */
  storageKey: string;
  /** Feature to check – only show when this feature is disabled */
  featureKey: FeatureName;
  /** Short benefit message */
  message: string;
  /** Optional "Learn more" link (defaults to /settings) */
  learnMoreHref?: string;
  learnMoreLabel?: string;
}

export function FeatureTeaser({
  storageKey,
  featureKey,
  message,
  learnMoreHref = '/settings',
  learnMoreLabel = 'See in Features',
}: FeatureTeaserProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden until we read storage
  const enabled = useFeature(featureKey);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = STORAGE_PREFIX + storageKey;
      setDismissed(window.localStorage.getItem(key) === 'true');
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, 'true');
      setDismissed(true);
    } catch {}
  };

  if (enabled || dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/60 border border-border text-sm">
      <span className="text-muted-foreground">{message}</span>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
          <Link href={learnMoreHref}>{learnMoreLabel}</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={handleDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
