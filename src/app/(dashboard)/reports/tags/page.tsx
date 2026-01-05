import { Suspense } from 'react';
import TagReportsPage from '@/components/reports/tags/TagReportsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TagsFeatureGate } from '@/components/tags/TagsFeatureGate';

export default function TagReports() {
  return (
    <TagsFeatureGate>
      <Suspense fallback={<LoadingSpinner />}>
        <TagReportsPage />
      </Suspense>
    </TagsFeatureGate>
  );
}

