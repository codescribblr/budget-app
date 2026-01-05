'use client';

import { Suspense } from 'react';
import TrendsPage from '@/components/reports/TrendsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';

export default function Trends() {
  return (
    <PremiumFeatureGate
      featureName="Advanced Reporting"
      featureDescription="Access detailed trend analysis, spending patterns, and advanced analytics to gain deeper insights into your finances"
    >
      <Suspense fallback={<LoadingSpinner />}>
        <TrendsPage />
      </Suspense>
    </PremiumFeatureGate>
  );
}


