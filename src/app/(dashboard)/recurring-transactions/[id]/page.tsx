import { Suspense } from 'react';
import RecurringTransactionDetailPage from '@/components/recurring-transactions/RecurringTransactionDetailPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default async function RecurringTransactionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RecurringTransactionDetailPage id={id} />
    </Suspense>
  );
}



