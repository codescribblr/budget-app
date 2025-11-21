'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { TransactionWithSplits, Category } from '@/lib/types';
import SpendingByCategory from './SpendingByCategory';
import SpendingPieChart from './SpendingPieChart';
import TransactionsByMerchant from './TransactionsByMerchant';
import { X } from 'lucide-react';

interface MerchantGroupStat {
  group_id: number;
  display_name: string;
  transaction_count: number;
  total_amount: number;
  average_amount: number;
  patterns: string[];
}

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Merchant stats state
  const [merchantStats, setMerchantStats] = useState<MerchantGroupStat[]>([]);
  const [loadingMerchantStats, setLoadingMerchantStats] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('current-month');
  const [isInitialized, setIsInitialized] = useState(false);

  // Category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // System category toggle for merchants
  const [includeSystemCategories, setIncludeSystemCategories] = useState(false);

  // Initialize from URL parameters on mount
  useEffect(() => {
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const dateRangeParam = searchParams.get('dateRange');
    const categoryParam = searchParams.get('category');

    if (startDateParam || endDateParam || dateRangeParam) {
      // Load from URL
      if (startDateParam) setStartDate(startDateParam);
      if (endDateParam) setEndDate(endDateParam);
      if (dateRangeParam) setDateRange(dateRangeParam);
    } else {
      // No URL params, use default (current-month)
      setDateRange('current-month');
    }

    if (categoryParam) {
      setSelectedCategoryId(parseInt(categoryParam));
    }

    setIsInitialized(true);
  }, []); // Only run on mount

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoadingTransactions(true);
        const response = await fetch('/api/transactions');
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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
        // Current calendar month
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        newStartDate = currentMonthStart.toISOString().split('T')[0];
        newEndDate = currentMonthEnd.toISOString().split('T')[0];
        break;
      case 'last-month':
        // Previous calendar month
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
    updateURL(newStartDate, newEndDate, dateRange, selectedCategoryId);
  }, [dateRange, isInitialized]);

  // Update URL when filters change
  const updateURL = (start: string, end: string, range: string, categoryId: number | null) => {
    const params = new URLSearchParams();

    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);
    if (range) params.set('dateRange', range);
    if (categoryId !== null) params.set('category', categoryId.toString());

    router.push(`/reports?${params.toString()}`, { scroll: false });
  };

  // Memoize filtered transactions to prevent unnecessary re-renders
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Date filter (inclusive of both start and end dates)
      if (startDate || endDate) {
        const transactionDate = t.date; // Keep as string for comparison (YYYY-MM-DD format)

        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;
      }

      // Category filter
      if (selectedCategoryId !== null) {
        return t.splits.some(split => split.category_id === selectedCategoryId);
      }

      return true;
    });
  }, [transactions, startDate, endDate, selectedCategoryId]);

  // Memoize transaction IDs to prevent unnecessary API calls
  const filteredTransactionIds = useMemo(() => {
    return filteredTransactions.map(t => t.id);
  }, [filteredTransactions]);

  // Fetch merchant stats for all filtered transactions (single API call)
  useEffect(() => {
    const fetchMerchantStats = async () => {
      if (filteredTransactionIds.length === 0) {
        setMerchantStats([]);
        setLoadingMerchantStats(false);
        return;
      }

      setLoadingMerchantStats(true);
      try {
        const response = await fetch('/api/merchant-groups/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionIds: filteredTransactionIds }),
        });

        if (response.ok) {
          const stats = await response.json();
          setMerchantStats(stats);
        }
      } catch (error) {
        console.error('Error fetching merchant stats:', error);
      } finally {
        setLoadingMerchantStats(false);
      }
    };

    fetchMerchantStats();
  }, [filteredTransactionIds]);

  const selectedCategory = selectedCategoryId
    ? categories.find(c => c.id === selectedCategoryId)
    : null;

  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
  };

  const clearCategoryFilter = () => {
    setSelectedCategoryId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Spending Reports</h1>
        <p className="text-muted-foreground mt-1">Analyze your spending patterns and trends</p>
      </div>

      {/* Active Category Filter Indicator */}
      {selectedCategoryId && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Badge variant="secondary" className="text-sm">
            Filtered by: {categories.find(c => c.id === selectedCategoryId)?.name}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategoryId(null);
              updateURL(startDate, endDate, dateRange, null);
            }}
            className="h-7 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filter
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter your spending data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date-range">Quick Select</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger id="date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Current Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setStartDate(newStartDate);
                    setDateRange('custom');
                    updateURL(newStartDate, endDate, 'custom', selectedCategoryId);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setEndDate(newEndDate);
                    setDateRange('custom');
                    updateURL(startDate, newEndDate, 'custom', selectedCategoryId);
                  }}
                />
              </div>
            </div>

            <Separator />

            {/* Category Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category-filter">Filter by Category</Label>
                <Select
                  value={selectedCategoryId?.toString() || 'all'}
                  onValueChange={(value) => {
                    const newCategoryId = value === 'all' ? null : parseInt(value);
                    setSelectedCategoryId(newCategoryId);
                    // Update URL
                    if (newCategoryId) {
                      router.push(`/reports?category=${newCategoryId}`);
                    } else {
                      router.push('/reports');
                    }
                  }}
                >
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.filter(c => !c.is_system).map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {selectedCategory && (
                  <Button
                    variant="outline"
                    onClick={clearCategoryFilter}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filter: {selectedCategory.name}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* System Category Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-system"
                checked={includeSystemCategories}
                onCheckedChange={(checked) => setIncludeSystemCategories(checked === true)}
              />
              <label
                htmlFor="include-system"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include system categories (e.g., Transfer) in Top Merchants
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingByCategory
          transactions={filteredTransactions}
          categories={categories}
          onCategoryClick={handleCategoryClick}
          loading={loadingTransactions || loadingCategories}
          startDate={startDate}
          endDate={endDate}
        />
        <SpendingPieChart
          transactions={filteredTransactions}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryClick={handleCategoryClick}
          loading={loadingTransactions || loadingCategories}
          merchantStats={merchantStats}
          loadingMerchantStats={loadingMerchantStats}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <TransactionsByMerchant
          transactions={filteredTransactions}
          categories={categories}
          includeSystemCategories={includeSystemCategories}
          loading={loadingTransactions || loadingCategories}
          merchantStats={merchantStats}
          loadingMerchantStats={loadingMerchantStats}
          selectedCategoryId={selectedCategoryId}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}

