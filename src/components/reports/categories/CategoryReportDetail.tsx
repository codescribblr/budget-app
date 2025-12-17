'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { useFeature } from '@/contexts/FeatureContext';
import CategoryReportStats from './CategoryReportStats';
import CategoryReportCharts from './CategoryReportCharts';
import CategoryTransactionList from '../CategoryTransactionList';

export default function CategoryReportDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const categoryId = params?.id ? parseInt(params.id as string) : null;
  const categoryTypesEnabled = useFeature('category_types');

  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('current-month');
  const [isInitialized, setIsInitialized] = useState(false);

  // Update URL when filters change
  const updateURL = useCallback((start: string, end: string, range: string) => {
    if (!categoryId) return;
    const params = new URLSearchParams();

    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);
    if (range) params.set('dateRange', range);

    router.push(`/reports/categories/${categoryId}?${params.toString()}`, { scroll: false });
  }, [router, categoryId]);

  // Initialize from URL parameters on mount
  useEffect(() => {
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const dateRangeParam = searchParams.get('dateRange');

    if (startDateParam || endDateParam || dateRangeParam) {
      // Load from URL
      if (startDateParam) setStartDate(startDateParam);
      if (endDateParam) setEndDate(endDateParam);
      if (dateRangeParam) setDateRange(dateRangeParam);
    } else {
      // No URL params, use default (current-month)
      setDateRange('current-month');
    }

    setIsInitialized(true);
  }, []); // Only run on mount

  // Fetch category, categories, and transactions
  useEffect(() => {
    const fetchData = async () => {
      if (!categoryId) return;

      try {
        setLoading(true);
        const [categoryRes, categoriesRes, transactionsRes] = await Promise.all([
          fetch(`/api/categories/${categoryId}`),
          fetch('/api/categories?includeArchived=all'),
          fetch('/api/transactions'),
        ]);

        if (!categoryRes.ok || !categoriesRes.ok || !transactionsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const categoryData = await categoryRes.json();
        const categoriesData = await categoriesRes.json();
        const transactionsData = await transactionsRes.json();

        setCategory(categoryData);
        setCategories(categoriesData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId]);

  // Update dates when date range preset changes
  useEffect(() => {
    // Don't run until initialized
    if (!isInitialized) return;

    // Only update if dateRange is from a preset (not 'custom')
    if (dateRange === 'custom') return;

    // Set date range based on selection
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let newStartDate = '';
    let newEndDate = '';

    switch (dateRange) {
      case 'current-month':
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        newStartDate = currentMonthStart.toISOString().split('T')[0];
        newEndDate = currentMonthEnd.toISOString().split('T')[0];
        break;
      case 'last-month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        newStartDate = lastMonth.toISOString().split('T')[0];
        newEndDate = lastMonthEnd.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        newStartDate = weekAgo.toISOString().split('T')[0];
        newEndDate = end;
        break;
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        newStartDate = quarterAgo.toISOString().split('T')[0];
        newEndDate = end;
        break;
      case 'current-year':
        // Current calendar year (January 1 to December 31)
        const currentYearStart = new Date(today.getFullYear(), 0, 1);
        const currentYearEnd = new Date(today.getFullYear(), 11, 31);
        newStartDate = currentYearStart.toISOString().split('T')[0];
        newEndDate = currentYearEnd.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        newStartDate = yearAgo.toISOString().split('T')[0];
        newEndDate = end;
        break;
      case 'all':
        newStartDate = '';
        newEndDate = '';
        break;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    updateURL(newStartDate, newEndDate, dateRange);
  }, [dateRange, isInitialized, updateURL]);

  // Filter transactions by date and category
  const filteredTransactions = useMemo(() => {
    if (!categoryId) return [];

    return transactions.filter(t => {
      // Must have a split in this category
      if (!t.splits.some(split => split.category_id === categoryId)) {
        return false;
      }

      // Date filter (inclusive of both start and end dates)
      if (startDate || endDate) {
        const transactionDate = t.date;
        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;
      }

      return true;
    });
  }, [transactions, categoryId, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!category || !categoryId) {
    return (
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/reports/categories')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Category Not Found</h1>
          <p className="text-muted-foreground mt-1">The requested category could not be found.</p>
        </div>
      </div>
    );
  }

  const getCategoryTypeBadge = () => {
    if (!categoryTypesEnabled || !category.category_type) return null;

    const typeLabels: Record<string, string> = {
      monthly_expense: 'Monthly Expense',
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/reports/categories')}
          className="mb-2 md:mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Categories</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">{category.name}</h1>
          {getCategoryTypeBadge()}
        </div>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Detailed reports and analytics for this category
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger id="date-range" className="w-full sm:w-[160px] md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-month">Current Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
            <SelectItem value="current-year">Current Year</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-[calc(50%-0.25rem)] sm:w-auto md:w-auto">
          <DatePicker
            id="start-date"
            date={parseLocalDate(startDate)}
            onDateChange={(date) => {
              const newStartDate = formatLocalDate(date);
              setStartDate(newStartDate);
              setDateRange('custom');
              updateURL(newStartDate, endDate, 'custom');
            }}
            placeholder="Start date"
          />
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-auto md:w-auto">
          <DatePicker
            id="end-date"
            date={parseLocalDate(endDate)}
            onDateChange={(date) => {
              const newEndDate = formatLocalDate(date);
              setEndDate(newEndDate);
              setDateRange('custom');
              updateURL(startDate, newEndDate, 'custom');
            }}
            placeholder="End date"
          />
        </div>
      </div>

      {/* Category Stats */}
      <CategoryReportStats
        category={category}
        transactions={filteredTransactions}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Charts and Visualizations */}
      <CategoryReportCharts
        category={category}
        transactions={filteredTransactions}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Transaction List */}
      <CategoryTransactionList
        transactions={filteredTransactions}
        categories={categories}
        selectedCategoryId={categoryId}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

