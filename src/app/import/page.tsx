'use client';

import ImportTransactionsPage from '@/components/import/ImportTransactionsPage';
import AppHeader from '@/components/layout/AppHeader';

export default function ImportPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader title="Import Transactions" />
      <ImportTransactionsPage />
    </div>
  );
}

