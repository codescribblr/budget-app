'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoryTransactionSizeDistributionProps {
  transactions: TransactionWithSplits[];
  category: Category;
}

// Define transaction size buckets
const SIZE_BUCKETS = [
  { label: '$0-25', min: 0, max: 25 },
  { label: '$25-50', min: 25, max: 50 },
  { label: '$50-100', min: 50, max: 100 },
  { label: '$100-250', min: 100, max: 250 },
  { label: '$250-500', min: 250, max: 500 },
  { label: '$500+', min: 500, max: Infinity },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CategoryTransactionSizeDistribution({ transactions, category }: CategoryTransactionSizeDistributionProps) {
  const chartData = useMemo(() => {
    // Group transactions by size bucket
    const bucketData = new Map<number, { count: number; total: number }>();

    transactions.forEach(transaction => {
      const categorySplit = transaction.splits.find(s => s.category_id === category.id);
      if (!categorySplit) return;

      const amount = transaction.transaction_type === 'expense'
        ? categorySplit.amount
        : -categorySplit.amount;

      // Only count expenses (positive amounts)
      if (amount > 0) {
        // Find which bucket this transaction belongs to
        const bucketIndex = SIZE_BUCKETS.findIndex(
          bucket => amount >= bucket.min && (bucket.max === Infinity || amount < bucket.max)
        );

        if (bucketIndex >= 0) {
          const current = bucketData.get(bucketIndex) || { count: 0, total: 0 };
          bucketData.set(bucketIndex, {
            count: current.count + 1,
            total: current.total + amount,
          });
        }
      }
    });

    // Convert to array format for recharts
    const data = SIZE_BUCKETS.map((bucket, index) => {
      const stats = bucketData.get(index) || { count: 0, total: 0 };
      return {
        bucket: bucket.label,
        count: stats.count,
        total: stats.total,
        average: stats.count > 0 ? stats.total / stats.count : 0,
      };
    });

    return data;
  }, [transactions, category.id]);

  const totalTransactions = chartData.reduce((sum, d) => sum + d.count, 0);
  const mostCommonBucket = chartData.reduce((max, d) => d.count > max.count ? d : max, chartData[0] || { count: 0, bucket: '' });
  const averageTransactionSize = chartData.reduce((sum, d) => sum + d.total, 0) / totalTransactions || 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalTransactions > 0 ? (data.count / totalTransactions) * 100 : 0;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="font-semibold mb-2 text-foreground">{data.bucket}</div>
          <div className="text-sm space-y-1">
            <div className="font-medium text-foreground">Transactions: {data.count}</div>
            <div className="text-xs text-muted-foreground">
              {percentage.toFixed(1)}% of total
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {formatCurrency(data.total)}
            </div>
            {data.count > 0 && (
              <div className="text-xs text-muted-foreground">
                Avg: {formatCurrency(data.average)}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-base md:text-2xl font-bold">{totalTransactions}</div>
        </div>
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Most Common</div>
          <div className="text-base md:text-2xl font-bold">{mostCommonBucket?.bucket || '—'}</div>
          <div className="text-xs text-muted-foreground">
            {mostCommonBucket?.count || 0} transactions
          </div>
        </div>
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Average Size</div>
          <div className="text-base md:text-2xl font-bold">{formatCurrency(averageTransactionSize)}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: 'Number of Transactions', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Transaction Count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


