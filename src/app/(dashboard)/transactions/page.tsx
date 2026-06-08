import { Suspense } from 'react';
import TransactionsPage from '@/components/transactions/TransactionsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Transactions() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TransactionsPage />
    </Suspense>
  );
}


