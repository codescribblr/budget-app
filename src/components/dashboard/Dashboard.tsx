'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type {
  Category,
  Account,
  CreditCard,
  PendingCheck,
  DashboardSummary,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import CategoryList from './CategoryList';
import AccountList from './AccountList';
import CreditCardList from './CreditCardList';
import PendingCheckList from './PendingCheckList';
import SummaryCards from './SummaryCards';
import SignOutButton from '@/components/auth/SignOutButton';

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPendingChecksOpen, setIsPendingChecksOpen] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, accountsRes, creditCardsRes, pendingChecksRes, summaryRes] =
        await Promise.all([
          fetch('/api/categories'),
          fetch('/api/accounts'),
          fetch('/api/credit-cards'),
          fetch('/api/pending-checks'),
          fetch('/api/dashboard'),
        ]);

      const [categoriesData, accountsData, creditCardsData, pendingChecksData, summaryData] =
        await Promise.all([
          categoriesRes.json(),
          accountsRes.json(),
          creditCardsRes.json(),
          pendingChecksRes.json(),
          summaryRes.json(),
        ]);

      setCategories(categoriesData);
      setAccounts(accountsData);
      setCreditCards(creditCardsData);
      setPendingChecks(pendingChecksData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Budget Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/transactions'} size="sm" className="md:size-default">
            Transactions
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/import'} size="sm" className="md:size-default">
            Import
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/money-movement'} size="sm" className="md:size-default">
            Money Movement
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/reports'} size="sm" className="md:size-default">
            Reports
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/income'} size="sm" className="md:size-default">
            Income
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/merchants'} size="sm" className="md:size-default">
            Merchants
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/settings'} size="sm" className="md:size-default">
            Settings
          </Button>
          <SignOutButton />
        </div>
      </div>

      <Separator />

      {summary && <SummaryCards summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-400px)]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Budget Categories (Envelopes)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <CategoryList categories={categories} onUpdate={fetchData} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountList accounts={accounts} onUpdate={fetchData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <CreditCardList creditCards={creditCards} onUpdate={fetchData} />
            </CardContent>
          </Card>

          <Collapsible open={isPendingChecksOpen} onOpenChange={setIsPendingChecksOpen}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="p-0 hover:bg-transparent">
                      <CardTitle className="flex items-center gap-2">
                        Pending Checks
                        <span className="text-sm font-normal text-muted-foreground">
                          ({pendingChecks.length})
                        </span>
                      </CardTitle>
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <PendingCheckList pendingChecks={pendingChecks} onUpdate={fetchData} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      <div className="flex gap-4 justify-center pt-6">
        <Button size="lg" onClick={() => window.location.href = '/transactions'}>
          View Transactions
        </Button>
      </div>
    </div>
  );
}

