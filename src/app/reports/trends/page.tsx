import { Suspense } from 'react';
import TrendsPage from '@/components/reports/TrendsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Trends() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TrendsPage />
    </Suspense>
  );
}

