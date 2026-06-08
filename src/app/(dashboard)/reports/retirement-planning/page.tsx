'use client';

import { Suspense } from 'react';
import ForecastPage from '@/components/reports/ForecastPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';

export default function RetirementPlanning() {
  return (
    <PremiumFeatureGate
      featureName="Retirement Planning"
      featureDescription="Project your future net worth and plan for retirement based on your assets, loans, income growth, and historical trends"
      featureKey="retirement_planning"
    >
      <Suspense fallback={<LoadingSpinner />}>
        <ForecastPage />
      </Suspense>
    </PremiumFeatureGate>
  );
}
