'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Tag } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface TagSpendingReportProps {
  transactions: TransactionWithSplits[];
  tags: Tag[];
  startDate?: string;
  endDate?: string;
  loading?: boolean;
}

export default function TagSpendingReport({
  transactions,
  tags,
  startDate = '',
  endDate = '',
  loading = false,
}: TagSpendingReportProps) {
  const tagStats = useMemo(() => {
    // Filter transactions by date range if provided
    let filteredTransactions = transactions;
    if (startDate || endDate) {
      filteredTransactions = transactions.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      });
    }

    // Calculate stats for each tag
    const stats = tags.map(tag => {
      const tagTransactions = filteredTransactions.filter(t =>
        t.tags?.some(tt => tt.id === tag.id)
      );

      const totalAmount = tagTransactions.reduce((sum, t) => {
        const multiplier = t.transaction_type === 'income' ? -1 : 1;
        return sum + (t.total_amount * multiplier);
      }, 0);

      const expenseAmount = tagTransactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.total_amount, 0);

      const incomeAmount = tagTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.total_amount, 0);

      return {
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        transactionCount: tagTransactions.length,
        totalAmount,
        expenseAmount,
        incomeAmount,
      };
    })
    .filter(stat => stat.transactionCount > 0)
    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));

    return stats;
  }, [transactions, tags, startDate, endDate]);

  const chartData = tagStats.map(stat => ({
    name: stat.tagName,
    expenses: stat.expenseAmount,
    income: stat.incomeAmount,
    net: stat.totalAmount,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Tag</CardTitle>
          <CardDescription>Transaction totals grouped by tag</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Tag</CardTitle>
        <CardDescription>
          {startDate || endDate
            ? `Transactions from ${startDate || 'beginning'} to ${endDate || 'now'}`
            : 'All transactions'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tagStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions with tags found in this date range.
          </div>
        ) : (
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Tag: ${label}`}
                />
                <Legend />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              <h3 className="font-semibold">Tag Summary</h3>
              <div className="space-y-1">
                {tagStats.map((stat) => (
                  <div
                    key={stat.tagId}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {stat.tagColor && (
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: stat.tagColor }}
                        />
                      )}
                      <span className="font-medium">{stat.tagName}</span>
                      <span className="text-sm text-muted-foreground">
                        ({stat.transactionCount} transaction{stat.transactionCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${stat.totalAmount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(stat.totalAmount))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.expenseAmount > 0 && formatCurrency(stat.expenseAmount)} expenses
                        {stat.expenseAmount > 0 && stat.incomeAmount > 0 && ' • '}
                        {stat.incomeAmount > 0 && formatCurrency(stat.incomeAmount)} income
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
