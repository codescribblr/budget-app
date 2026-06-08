import { Suspense } from 'react';
import ReportsPage from '@/components/reports/ReportsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Reports() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ReportsPage />
    </Suspense>
  );
}


