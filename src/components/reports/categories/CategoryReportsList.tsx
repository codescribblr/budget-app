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
  ytdBudget?: number; // For monthly_expense categories (YTD budget)
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
          fetch('/api/categories?includeArchived=all'),
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
    const currentMonth = now.getMonth() + 1; // 1-12

    categories
      .filter(cat => !cat.is_system && !cat.is_buffer)
      .forEach(category => {
        // Get only YTD transactions (current calendar year)
        const ytdTransactions = transactions.filter(t => {
          const hasCategorySplit = t.splits.some(split => split.category_id === category.id);
          const isYTD = t.date >= ytdStartDate;
          return hasCategorySplit && isYTD;
        });

        // Calculate spending (expenses add, income subtracts) for YTD
        let totalSpent = 0;
        let lastTransactionDate: string | null = null;

        ytdTransactions.forEach(transaction => {
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

        const transactionCount = ytdTransactions.length;
        const monthlyBudget = category.monthly_amount || 0;
        
        // Calculate average based on category type
        let averageAmount = 0;
        if (categoryTypesEnabled && category.category_type) {
          if (category.category_type === 'monthly_expense') {
            // Monthly average: divide by number of months in current year
            averageAmount = currentMonth > 0 ? totalSpent / currentMonth : 0;
          } else {
            // Annual average for accumulation and target_balance: divide by 12
            averageAmount = totalSpent / 12;
          }
        } else {
          // Fallback: per-transaction average
          averageAmount = transactionCount > 0 ? totalSpent / transactionCount : 0;
        }
        
        // Calculate variance based on category type
        let variance: number;
        let ytdSpent: number | undefined;
        let annualTarget: number | undefined;
        let ytdBudget: number | undefined;

        if (categoryTypesEnabled && category.category_type === 'monthly_expense') {
          // For monthly_expense: Compare YTD spending to YTD budget
          ytdBudget = monthlyBudget * currentMonth;
          variance = ytdBudget - totalSpent;
        } else if (categoryTypesEnabled && category.category_type === 'accumulation') {
          // For accumulation: Compare YTD spent to annual target
          annualTarget = category.annual_target || (monthlyBudget * 12);
          ytdSpent = totalSpent; // Already calculated as YTD above
          variance = annualTarget - ytdSpent; // Variance from annual target
        } else if (categoryTypesEnabled && category.category_type === 'target_balance') {
          // For target_balance: Compare current balance to target balance
          const targetBalance = category.target_balance || 0;
          const currentBalance = category.current_balance || 0;
          variance = targetBalance - currentBalance;
        } else {
          // Fallback for categories without type: Compare YTD spending to YTD budget
          ytdBudget = monthlyBudget * currentMonth;
          variance = ytdBudget - totalSpent;
        }

        stats.push({
          category,
          totalSpent, // This is now YTD total
          transactionCount,
          averageAmount, // Monthly or annual average based on type
          lastTransactionDate,
          currentBalance: category.current_balance || 0,
          monthlyBudget,
          variance,
          ytdSpent,
          annualTarget,
          ytdBudget,
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
            Showing year-to-date (YTD) statistics for {new Date().getFullYear()}. Click on a category to view detailed reports and analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">
                    <div className="flex flex-col">
                      <span>Total Spent</span>
                      <span className="text-xs font-normal text-muted-foreground">(YTD)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex flex-col">
                      <span>Average</span>
                      <span className="text-xs font-normal text-muted-foreground">(per month/year)</span>
                    </div>
                  </TableHead>
                    {categoryTypesEnabled && (
                      <>
                        <TableHead className="text-right">
                          <div className="flex flex-col">
                            <span>Budget</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              (Period)
                            </span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex flex-col">
                            <span>Variance</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              (vs Budget)
                            </span>
                          </div>
                        </TableHead>
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
                      {stat.transactionCount > 0 ? (
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(stat.averageAmount)}</span>
                          {categoryTypesEnabled && stat.category.category_type && (
                            <span className="text-xs">
                              {stat.category.category_type === 'monthly_expense' ? '/month' : '/year'}
                            </span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    {categoryTypesEnabled && (
                      <>
                        <TableCell className="text-right text-muted-foreground">
                          {stat.category.category_type === 'accumulation' && stat.annualTarget
                            ? formatCurrency(stat.annualTarget)
                            : stat.category.category_type === 'monthly_expense' && stat.ytdBudget !== undefined
                            ? formatCurrency(stat.ytdBudget)
                            : formatCurrency(stat.monthlyBudget)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            stat.variance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {stat.category.category_type === 'accumulation' && stat.annualTarget && stat.ytdSpent !== undefined
                            ? formatCurrency(stat.variance)
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

