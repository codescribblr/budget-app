import { Suspense } from 'react';
import CategoryReportDetail from '@/components/reports/categories/CategoryReportDetail';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import { FeatureGate } from '@/components/reports/categories/FeatureGate';

export default function CategoryReportDetailPage() {
  return (
    <PremiumFeatureGate
      featureName="Advanced Reporting"
      featureDescription="Detailed category reports with analytics, trends, and insights"
    >
      <FeatureGate featureName="advanced_reporting">
        <Suspense fallback={<LoadingSpinner />}>
          <CategoryReportDetail />
        </Suspense>
      </FeatureGate>
    </PremiumFeatureGate>
  );
}

