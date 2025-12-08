'use client';

import ImportTransactionsPage from '@/components/import/ImportTransactionsPage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Inbox, Settings, Crown } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function ImportPage() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Import Transactions</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild>
            <Link href="/imports/queue">
              <Inbox className="mr-2 h-4 w-4" />
              View Import Queue
            </Link>
          </Button>
          {isPremium ? (
            <Button variant="outline" asChild>
              <Link href="/settings/automatic-imports">
                <Settings className="mr-2 h-4 w-4" />
                Setup Automatic Imports
              </Link>
            </Button>
          ) : (
            <Button
              variant="default"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
              asChild
            >
              <Link href="/settings/subscription">
                <Crown className="mr-2 h-4 w-4" />
                Setup Automatic Imports
              </Link>
            </Button>
          )}
        </div>
      </div>
      <ImportTransactionsPage />
    </div>
  );
}

