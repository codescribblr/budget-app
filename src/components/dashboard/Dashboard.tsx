'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type {
  Category,
  Account,
  CreditCard,
  Loan,
  PendingCheck,
  DashboardSummary,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import CategoryList from './CategoryList';
import AccountList from './AccountList';
import CreditCardList from './CreditCardList';
import LoanList from './LoanList';
import PendingCheckList from './PendingCheckList';
import SummaryCards from './SummaryCards';
import GoalsWidget from './GoalsWidget';

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPendingChecksOpen, setIsPendingChecksOpen] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, accountsRes, creditCardsRes, loansRes, pendingChecksRes, summaryRes] =
        await Promise.all([
          fetch('/api/categories'),
          fetch('/api/accounts'),
          fetch('/api/credit-cards'),
          fetch('/api/loans'),
          fetch('/api/pending-checks'),
          fetch('/api/dashboard'),
        ]);

      const [categoriesData, accountsData, creditCardsData, loansData, pendingChecksData, summaryData] =
        await Promise.all([
          categoriesRes.json(),
          accountsRes.json(),
          creditCardsRes.json(),
          loansRes.json(),
          pendingChecksRes.json(),
          summaryRes.json(),
        ]);

      setCategories(categoriesData);
      setAccounts(accountsData);
      setCreditCards(creditCardsData);
      setLoans(loansData);
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
    <div className="space-y-4 md:space-y-6">

      {summary && <SummaryCards summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-400px)]">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget Categories (Envelopes)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <CategoryList categories={categories} summary={summary} onUpdate={fetchData} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card id="accounts-section">
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountList accounts={accounts} onUpdate={fetchData} />
            </CardContent>
          </Card>

          <Card id="credit-cards-section">
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

          <Card id="loans-section">
            <CardHeader>
              <CardTitle>Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <LoanList loans={loans} onUpdate={fetchData} />
            </CardContent>
          </Card>

          <GoalsWidget />
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

