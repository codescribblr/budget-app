import { Suspense } from 'react';
import RecurringTransactionsPage from '@/components/recurring-transactions/RecurringTransactionsPage';
import { RecurringTransactionsFeatureGate } from '@/components/recurring-transactions/RecurringTransactionsFeatureGate';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function RecurringTransactions() {
  return (
    <RecurringTransactionsFeatureGate>
      <Suspense fallback={<LoadingSpinner />}>
        <RecurringTransactionsPage />
      </Suspense>
    </RecurringTransactionsFeatureGate>
  );
}




