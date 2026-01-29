'use client';

import { Suspense } from 'react';
import ForecastPage from '@/components/reports/ForecastPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';

export default function Forecast() {
  return (
    <PremiumFeatureGate
      featureName="Net Worth Forecast"
      featureDescription="Project your future net worth based on your assets, loans, income growth, and historical trends"
    >
      <Suspense fallback={<LoadingSpinner />}>
        <ForecastPage />
      </Suspense>
    </PremiumFeatureGate>
  );
}
