import { Suspense } from 'react';
import DuplicateTransactionFinder from '@/components/settings/DuplicateTransactionFinder';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DuplicatesPage() {
  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Duplicate Transactions</h1>
      </div>
      <Suspense fallback={<LoadingSpinner />}>
        <DuplicateTransactionFinder />
      </Suspense>
    </div>
  );
}

