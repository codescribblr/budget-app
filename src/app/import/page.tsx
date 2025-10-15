'use client';

import { Button } from '@/components/ui/button';
import ImportTransactionsPage from '@/components/import/ImportTransactionsPage';

export default function ImportPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Import Transactions</h1>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Back to Dashboard
        </Button>
      </div>
      <ImportTransactionsPage />
    </div>
  );
}

