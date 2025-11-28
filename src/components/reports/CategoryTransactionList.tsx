'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CategoryTransactionListProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  selectedCategoryId: number | null;
  startDate?: string;
  endDate?: string;
}

const TRANSACTIONS_PER_PAGE = 50;

export default function CategoryTransactionList({
  transactions,
  categories,
  selectedCategoryId,
  startDate = '',
  endDate = '',
}: CategoryTransactionListProps) {
  const [displayCount, setDisplayCount] = useState(TRANSACTIONS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter transactions to ensure they have a split in the selected category
  // (transactions are already filtered by date in ReportsPage)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.splits.some(split => split.category_id === selectedCategoryId)
    );
  }, [transactions, selectedCategoryId]);

  // Sort by date descending (most recent first)
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      // Compare dates (YYYY-MM-DD format sorts correctly as strings)
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      // If same date, sort by ID descending (most recent first)
      return b.id - a.id;
    });
  }, [filteredTransactions]);

  // Get displayed transactions
  const displayedTransactions = sortedTransactions.slice(0, displayCount);
  const hasMore = sortedTransactions.length > displayCount;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 200));
    setDisplayCount(prev => prev + TRANSACTIONS_PER_PAGE);
    setIsLoadingMore(false);
  };

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) || dateString;
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  if (!selectedCategoryId) {
    return null;
  }

  if (filteredTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            No transactions found for {selectedCategory?.name || 'this category'} in the selected time period
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} for{' '}
          {selectedCategory?.name || 'this category'}
          {startDate || endDate ? ' in selected time period' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-32">Merchant</TableHead>
                <TableHead className="min-w-[150px]">Categories</TableHead>
                <TableHead className="text-right w-32">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTransactions.map((transaction) => {
                // Get the amount for this specific category
                const categorySplit = transaction.splits.find(
                  split => split.category_id === selectedCategoryId
                );
                const categoryAmount = categorySplit?.amount || 0;
                const isExpense = transaction.transaction_type === 'expense';

                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate" title={transaction.description}>
                      {transaction.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {transaction.merchant_name ? (
                        <Badge variant="outline" className="text-xs max-w-[120px] truncate" title={transaction.merchant_name}>
                          {transaction.merchant_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {transaction.splits.map((split) => {
                          const category = categories.find(c => c.id === split.category_id);
                          const isSelectedCategory = split.category_id === selectedCategoryId;
                          return (
                            <Badge
                              key={split.id}
                              variant={isSelectedCategory ? 'default' : 'secondary'}
                              className="text-xs whitespace-nowrap"
                            >
                              {category?.name || 'Unknown'}: {formatCurrency(split.amount)}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-sm ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(categoryAmount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              variant="outline"
            >
              {isLoadingMore ? (
                <>
                  <LoadingSpinner className="mr-2" size="sm" showText={false} />
                  Loading...
                </>
              ) : (
                `Load More (${sortedTransactions.length - displayCount} remaining)`
              )}
            </Button>
          </div>
        )}

        {!hasMore && displayedTransactions.length > TRANSACTIONS_PER_PAGE && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            Showing all {filteredTransactions.length} transactions
          </div>
        )}
      </CardContent>
    </Card>
  );
}

