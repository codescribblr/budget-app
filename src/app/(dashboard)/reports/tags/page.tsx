import { Suspense } from 'react';
import TagReportsPage from '@/components/reports/tags/TagReportsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function TagReports() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TagReportsPage />
    </Suspense>
  );
}
