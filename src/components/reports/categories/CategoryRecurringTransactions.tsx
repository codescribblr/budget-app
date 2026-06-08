'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Calendar, Repeat } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { useFeature } from '@/contexts/FeatureContext';

interface RecurringTransactionSummary {
  id: number;
  merchant_name: string;
  frequency: string;
  expected_amount: number;
  transaction_type: 'income' | 'expense';
  next_expected_date: string | null;
  is_confirmed: boolean;
}

interface CategoryRecurringTransactionsProps {
  category: Category;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  bimonthly: 'Bimonthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export default function CategoryRecurringTransactions({ category }: CategoryRecurringTransactionsProps) {
  const recurringEnabled = useFeature('recurring_transactions');
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransactionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recurringEnabled) {
      setLoading(false);
      return;
    }

    const fetchRecurring = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          isActive: 'true',
          categoryId: String(category.id),
        });
        const response = await fetch(`/api/recurring-transactions?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setRecurringTransactions(data.recurringTransactions || []);
        }
      } catch (error) {
        console.error('Error fetching category recurring transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecurring();
  }, [category.id, recurringEnabled]);

  if (!recurringEnabled) {
    return null;
  }

  const monthlyTotal = recurringTransactions.reduce((sum, rt) => {
    const amount = Math.abs(rt.expected_amount || 0);
    const sign = rt.transaction_type === 'expense' ? 1 : -1;
    const multiplier =
      rt.frequency === 'weekly' ? 52 / 12 :
      rt.frequency === 'biweekly' ? 26 / 12 :
      rt.frequency === 'yearly' ? 1 / 12 :
      rt.frequency === 'quarterly' ? 1 / 3 :
      rt.frequency === 'bimonthly' ? 1 / 2 :
      1;
    return sum + sign * amount * multiplier;
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring Transactions
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Active recurring charges and income in this category
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : recurringTransactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>No active recurring transactions in {category.name}.</p>
            <Button variant="link" asChild className="mt-2 px-0">
              <Link href="/recurring-transactions">Detect recurring patterns</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Est. monthly from recurring: </span>
              <span className={monthlyTotal >= 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                {monthlyTotal >= 0 ? '-' : '+'}
                {formatCurrency(Math.abs(monthlyTotal))}
              </span>
            </div>
            <ul className="space-y-3">
              {recurringTransactions.map((rt) => (
                <li key={rt.id}>
                  <Link
                    href={`/recurring-transactions/${rt.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{rt.merchant_name}</span>
                        {!rt.is_confirmed && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Unconfirmed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {FREQUENCY_LABELS[rt.frequency] || rt.frequency}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className={rt.transaction_type === 'expense' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {rt.transaction_type === 'expense' ? '-' : '+'}
                        {formatCurrency(Math.abs(rt.expected_amount || 0))}
                      </p>
                      {rt.next_expected_date && (
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(rt.next_expected_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/recurring-transactions">View all recurring transactions</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
