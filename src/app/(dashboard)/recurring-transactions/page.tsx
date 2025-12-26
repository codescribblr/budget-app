import { Suspense } from 'react';
import RecurringTransactionsPage from '@/components/recurring-transactions/RecurringTransactionsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function RecurringTransactions() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RecurringTransactionsPage />
    </Suspense>
  );
}



