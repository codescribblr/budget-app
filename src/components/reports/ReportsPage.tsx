'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import type { TransactionWithSplits, Category } from '@/lib/types';
import SpendingByCategory from './SpendingByCategory';
import SpendingPieChart from './SpendingPieChart';
import TransactionsByMerchant from './TransactionsByMerchant';
import CategoryTransactionList from './CategoryTransactionList';
import { X } from 'lucide-react';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';

interface MerchantGroupStat {
  group_id: number;
  display_name: string;
  transaction_count: number;
  total_amount: number;
  average_amount: number;
  patterns: string[];
  logo_url?: string | null;
  icon_name?: string | null;
}

export default function ReportsPage({ onReviewReadyChange }: { onReviewReadyChange?: (ready: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const reportsPath = pathname.startsWith('/new/') ? '/new/reports' : '/reports';
  const searchParams = useSearchParams();
  const checkin = searchParams.get('checkin');
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [transactionError, setTransactionError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [merchantError, setMerchantError] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);

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
      setStartDate(startDateParam || '');
      setEndDate(endDateParam || '');
      setDateRange(dateRangeParam || 'custom');
    } else {
      // No URL params, use default (current-month)
      setDateRange(checkin === 'weekly' ? 'week' : checkin === 'monthly' ? 'last-month' : 'current-month');
    }

    setSelectedCategoryId(categoryParam ? parseInt(categoryParam) : null);

    setIsInitialized(true);
  }, [searchParams]); // Re-run when searchParams change

  // Fetch transactions with date filters to avoid hitting Supabase limit
  useEffect(() => {
    if (!isInitialized) return;
    const controller = new AbortController();
    const fetchTransactions = async () => {
      try {
        setLoadingTransactions(true);
        setTransactionError('');
        
        // Build transactions URL with date filters if dates are set
        const transactionsUrl = new URL('/api/transactions', window.location.origin);
        if (startDate) {
          transactionsUrl.searchParams.set('startDate', startDate);
        }
        if (endDate) {
          transactionsUrl.searchParams.set('endDate', endDate);
        }
        
        const response = await fetch(transactionsUrl.toString(), { signal: controller.signal });
        if (!response.ok) throw new Error('Transaction request failed');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid transaction response');
        if (!controller.signal.aborted) setTransactions(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching transactions:', error);
          setTransactions([]);
          setTransactionError('We couldn’t load your transactions. Retry to see spending for this period.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingTransactions(false);
      }
    };

    fetchTransactions();
    return () => controller.abort();
  }, [startDate, endDate, isInitialized, retryAttempt]);

  // Fetch categories
  useEffect(() => {
    const controller = new AbortController();
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        setCategoryError('');
        const response = await fetch('/api/categories?includeArchived=all', { signal: controller.signal });
        if (!response.ok) throw new Error('Category request failed');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid category response');
        if (!controller.signal.aborted) setCategories(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching categories:', error);
          setCategories([]);
          setCategoryError('We couldn’t load your envelopes. Retry to see spending by category.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingCategories(false);
      }
    };

    fetchCategories();
    return () => controller.abort();
  }, [retryAttempt]);

  // Update URL when filters change
  const updateURL = useCallback((start: string, end: string, range: string, categoryId: number | null) => {
    const params = new URLSearchParams();
    if (checkin) params.set('checkin', checkin);

    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);
    if (range) params.set('dateRange', range);
    if (categoryId !== null) params.set('category', categoryId.toString());

    router.push(`${reportsPath}?${params.toString()}`, { scroll: false });
  }, [router, reportsPath, checkin]);

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
    updateURL(newStartDate, newEndDate, dateRange, selectedCategoryId);
  }, [dateRange, isInitialized, selectedCategoryId, updateURL]);

  // Memoize filtered transactions to prevent unnecessary re-renders
  const filteredTransactions = useMemo(() => {
    // If dates aren't initialized yet, don't filter (show all)
    // This prevents filtering before dates are loaded from URL params
    const shouldFilterByDate = isInitialized && (startDate || endDate);
    
    const filtered = transactions.filter(t => {
      // Date filter (inclusive of both start and end dates)
      if (shouldFilterByDate) {
        const transactionDate = t.date; // Keep as string for comparison (YYYY-MM-DD format)
        
        // Ensure transaction date is valid
        if (!transactionDate) return false;

        // Compare dates as strings (YYYY-MM-DD format works with string comparison)
        if (startDate && startDate.trim() !== '' && transactionDate < startDate) return false;
        if (endDate && endDate.trim() !== '' && transactionDate > endDate) return false;
      }

      // Category filter
      if (selectedCategoryId !== null) {
        return t.splits.some(split => split.category_id === selectedCategoryId);
      }

      return true;
    });
    
    return filtered;
  }, [transactions, startDate, endDate, selectedCategoryId, isInitialized]);

  // Memoize transaction IDs to prevent unnecessary API calls
  const filteredTransactionIds = useMemo(() => {
    return filteredTransactions.map(t => t.id);
  }, [filteredTransactions]);

  // Fetch merchant stats for all filtered transactions (single API call)
  useEffect(() => {
    const controller = new AbortController();
    const fetchMerchantStats = async () => {
      setMerchantError('');
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
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Merchant request failed');
        const stats = await response.json();
        if (!Array.isArray(stats)) throw new Error('Invalid merchant response');
        if (!controller.signal.aborted) setMerchantStats(stats);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching merchant stats:', error);
          setMerchantStats([]);
          setMerchantError('We couldn’t load your merchant totals. Retry to finish loading this report.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingMerchantStats(false);
      }
    };

    fetchMerchantStats();
    return () => controller.abort();
  }, [filteredTransactionIds, retryAttempt]);

  const reportError = transactionError || categoryError || merchantError;
  useEffect(() => {
    onReviewReadyChange?.(isInitialized && !loadingTransactions && !loadingCategories && !loadingMerchantStats && !reportError);
  }, [onReviewReadyChange, isInitialized, loadingTransactions, loadingCategories, loadingMerchantStats, reportError]);

  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    updateURL(startDate, endDate, dateRange, categoryId);
  };

  const clearCategoryFilter = () => {
    setSelectedCategoryId(null);
    updateURL(startDate, endDate, dateRange, null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Spending Reports</h1>
        <p className="text-muted-foreground mt-1">Analyze your spending patterns and trends</p>
      </div>

      <div className="compact-filters" aria-label="Report filters">
        <div className="compact-filter-row">
          <DateRangeFilter
            start={parseLocalDate(startDate)}
            end={parseLocalDate(endDate)}
            preset={{ value: dateRange, onChange: setDateRange }}
            onChange={(start, end) => {
              const from = formatLocalDate(start), to = formatLocalDate(end);
              const range = start || end ? 'custom' : 'all';
              setStartDate(from);
              setEndDate(to);
              setDateRange(range);
              updateURL(from, to, range, selectedCategoryId);
            }}
          />
          <div className="compact-filter-category">
            <Select value={selectedCategoryId?.toString() || 'all'} onValueChange={(value) => {
              const categoryId = value === 'all' ? null : parseInt(value);
              setSelectedCategoryId(categoryId);
              updateURL(startDate, endDate, dateRange, categoryId);
            }}>
              <SelectTrigger id="category-filter" aria-label="Category filter" className="compact-filter-select"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.filter(c => !c.is_system).map(category => <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedCategoryId !== null && <Button variant="ghost" size="icon" className="h-10 w-8 shrink-0" aria-label="Clear category filter" title="Clear category filter" onClick={clearCategoryFilter}><X className="h-4 w-4" /></Button>}
          </div>
          <div className="compact-filter-toggle">
            <Checkbox id="include-system" checked={includeSystemCategories} onCheckedChange={(checked) => setIncludeSystemCategories(checked === true)} />
            <label htmlFor="include-system">Include system categories</label>
          </div>
        </div>
      </div>

      {reportError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <h2 className="font-semibold">Reports could not be loaded</h2>
          <p className="text-sm text-muted-foreground">{reportError}</p>
          <Button variant="outline" onClick={() => setRetryAttempt(attempt => attempt + 1)}>Retry reports</Button>
        </div>
      ) : <>
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

      {/* Category Transaction List - Only show when a category is selected */}
      {selectedCategoryId && (
        <div className="grid grid-cols-1 gap-6">
          <CategoryTransactionList
            transactions={filteredTransactions}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      )}
      </>}
    </div>
  );
}


