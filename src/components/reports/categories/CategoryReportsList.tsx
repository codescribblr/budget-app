'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import type { Category, TransactionWithSplits } from '@/lib/types';
import { useFeature } from '@/contexts/FeatureContext';

interface CategoryStats {
  category: Category;
  totalSpent: number;
  transactionCount: number;
  averageAmount: number;
  lastTransactionDate: string | null;
  currentBalance: number;
  monthlyBudget: number;
  variance: number;
  ytdSpent?: number; // For accumulation categories
  annualTarget?: number; // For accumulation categories
}

export default function CategoryReportsList() {
  const router = useRouter();
  const categoryTypesEnabled = useFeature('category_types');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories and transactions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, transactionsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/transactions'),
        ]);

        if (!categoriesRes.ok || !transactionsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const categoriesData = await categoriesRes.json();
        const transactionsData = await transactionsRes.json();

        setCategories(categoriesData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats for each category
  const categoryStats = useMemo(() => {
    const stats: CategoryStats[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const ytdStartDate = `${currentYear}-01-01`;

    categories
      .filter(cat => !cat.is_system && !cat.is_buffer)
      .forEach(category => {
        // Get all transactions for this category
        const categoryTransactions = transactions.filter(t =>
          t.splits.some(split => split.category_id === category.id)
        );

        // Calculate spending (expenses add, income subtracts)
        let totalSpent = 0;
        let lastTransactionDate: string | null = null;

        categoryTransactions.forEach(transaction => {
          const split = transaction.splits.find(s => s.category_id === category.id);
          if (split) {
            const amount = transaction.transaction_type === 'expense'
              ? split.amount
              : -split.amount;
            totalSpent += amount;

            // Track last transaction date
            if (!lastTransactionDate || transaction.date > lastTransactionDate) {
              lastTransactionDate = transaction.date;
            }
          }
        });

        const transactionCount = categoryTransactions.length;
        const averageAmount = transactionCount > 0 ? totalSpent / transactionCount : 0;
        const monthlyBudget = category.monthly_amount || 0;
        const variance = monthlyBudget - totalSpent;

        // For accumulation categories, calculate YTD spent
        let ytdSpent: number | undefined;
        let annualTarget: number | undefined;

        if (categoryTypesEnabled && category.category_type === 'accumulation') {
          annualTarget = category.annual_target || (monthlyBudget * 12);
          
          // Calculate YTD spent
          const ytdTransactions = categoryTransactions.filter(t => {
            const transactionDate = t.date;
            return transactionDate >= ytdStartDate;
          });

          ytdSpent = 0;
          ytdTransactions.forEach(transaction => {
            const split = transaction.splits.find(s => s.category_id === category.id);
            if (split) {
              const amount = transaction.transaction_type === 'expense'
                ? split.amount
                : -split.amount;
              ytdSpent! += amount;
            }
          });
        }

        stats.push({
          category,
          totalSpent,
          transactionCount,
          averageAmount,
          lastTransactionDate,
          currentBalance: category.current_balance || 0,
          monthlyBudget,
          variance,
          ytdSpent,
          annualTarget,
        });
      });

    // Sort by total spent descending
    return stats.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [categories, transactions, categoryTypesEnabled]);

  const handleCategoryClick = (categoryId: number) => {
    router.push(`/reports/categories/${categoryId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = parseLocalDate(dateString);
    return date?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) || dateString;
  };

  const getCategoryTypeBadge = (category: Category) => {
    if (!categoryTypesEnabled || !category.category_type) return null;

    const typeLabels: Record<string, string> = {
      monthly_expense: 'Monthly',
      accumulation: 'Accumulation',
      target_balance: 'Target Balance',
    };

    const colors: Record<string, string> = {
      monthly_expense: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      accumulation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      target_balance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };

    return (
      <Badge className={colors[category.category_type] || 'bg-gray-100 text-gray-800'}>
        {typeLabels[category.category_type] || category.category_type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Category Reports</h1>
        <p className="text-muted-foreground mt-1">
          Detailed analytics and insights for each category
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Click on a category to view detailed reports and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  {categoryTypesEnabled && (
                    <>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Last Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStats.map((stat) => (
                  <TableRow
                    key={stat.category.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCategoryClick(stat.category.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{stat.category.name}</span>
                        {getCategoryTypeBadge(stat.category)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {stat.transactionCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(stat.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {stat.transactionCount > 0 ? formatCurrency(stat.averageAmount) : '—'}
                    </TableCell>
                    {categoryTypesEnabled && (
                      <>
                        <TableCell className="text-right text-muted-foreground">
                          {stat.category.category_type === 'accumulation' && stat.annualTarget
                            ? formatCurrency(stat.annualTarget)
                            : formatCurrency(stat.monthlyBudget)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            stat.variance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {stat.category.category_type === 'accumulation' && stat.annualTarget && stat.ytdSpent !== undefined
                            ? `${((stat.ytdSpent / stat.annualTarget) * 100).toFixed(0)}%`
                            : formatCurrency(stat.variance)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      <span
                        className={
                          stat.currentBalance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {formatCurrency(stat.currentBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(stat.lastTransactionDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {categoryStats.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No categories found. Create categories to see reports.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

