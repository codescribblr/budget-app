'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Tag } from '@/lib/types';
import { parseLocalDate } from '@/lib/date-utils';
import Link from 'next/link';

interface TagTransactionListProps {
  transactions: TransactionWithSplits[];
  tag: Tag;
  startDate?: string;
  endDate?: string;
}

export default function TagTransactionList({
  transactions,
  tag,
  startDate = '',
  endDate = '',
}: TagTransactionListProps) {
  const tagTransactions = useMemo(() => {
    return transactions
      .filter(t => t.tags?.some(tt => tt.id === tag.id))
      .sort((a, b) => {
        // Sort by date descending
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.created_at.localeCompare(a.created_at);
      });
  }, [transactions, tag]);

  const totalAmount = useMemo(() => {
    return tagTransactions.reduce((sum, t) => {
      const multiplier = t.transaction_type === 'income' ? -1 : 1;
      return sum + (t.total_amount * multiplier);
    }, 0);
  }, [tagTransactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions: {tag.name}</CardTitle>
        <CardDescription>
          {tagTransactions.length} transaction{tagTransactions.length !== 1 ? 's' : ''} • 
          Total: {formatCurrency(Math.abs(totalAmount))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tagTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found for this tag.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tagTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {parseLocalDate(transaction.date)?.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/transactions?editId=${transaction.id}`}
                      className="hover:underline"
                    >
                      {transaction.description}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {transaction.splits.map((split) => (
                        <Badge key={split.id} variant="secondary" className="text-xs">
                          {split.category_name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      transaction.transaction_type === 'income'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(transaction.total_amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

