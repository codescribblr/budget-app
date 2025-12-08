'use client';

import ImportTransactionsPage from '@/components/import/ImportTransactionsPage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Import Transactions</h1>
        <Button variant="outline" asChild>
          <Link href="/imports/queue">
            <Inbox className="mr-2 h-4 w-4" />
            View Import Queue
          </Link>
        </Button>
      </div>
      <ImportTransactionsPage />
    </div>
  );
}

