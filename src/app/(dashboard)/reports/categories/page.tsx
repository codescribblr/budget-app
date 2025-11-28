import { Suspense } from 'react';
import CategoryReportsList from '@/components/reports/categories/CategoryReportsList';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import { FeatureGate } from '@/components/reports/categories/FeatureGate';

export default function CategoryReports() {
  return (
    <PremiumFeatureGate
      featureName="Advanced Reporting"
      featureDescription="Detailed category reports with analytics, trends, and insights"
    >
      <FeatureGate featureName="advanced_reporting">
        <Suspense fallback={<LoadingSpinner />}>
          <CategoryReportsList />
        </Suspense>
      </FeatureGate>
    </PremiumFeatureGate>
  );
}

