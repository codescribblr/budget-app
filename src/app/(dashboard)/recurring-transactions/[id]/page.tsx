import { Suspense } from 'react';
import RecurringTransactionDetailPage from '@/components/recurring-transactions/RecurringTransactionDetailPage';
import { RecurringTransactionsFeatureGate } from '@/components/recurring-transactions/RecurringTransactionsFeatureGate';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default async function RecurringTransactionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RecurringTransactionsFeatureGate>
      <Suspense fallback={<LoadingSpinner />}>
        <RecurringTransactionDetailPage id={id} />
      </Suspense>
    </RecurringTransactionsFeatureGate>
  );
}



