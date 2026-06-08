'use client';

import { Suspense } from 'react';
import NetWorthTrackingPage from '@/components/net-worth/NetWorthTrackingPage';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function NetWorthRoutePage() {
  return (
    <PremiumFeatureGate
      featureName="Net Worth Tracking"
      featureDescription="Track your net worth over time with daily snapshots, a full breakdown by accounts and liabilities, and historical charts. Included with Retirement Planning."
      featureKey="retirement_planning"
    >
      <Suspense fallback={<LoadingSpinner />}>
        <NetWorthTrackingPage />
      </Suspense>
    </PremiumFeatureGate>
  );
}
