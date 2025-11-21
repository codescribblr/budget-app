'use client';

import ImportTransactionsPage from '@/components/import/ImportTransactionsPage';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Import Transactions</h1>
      <ImportTransactionsPage />
    </div>
  );
}

