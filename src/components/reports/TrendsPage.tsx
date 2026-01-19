'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TransactionWithSplits, Category } from '@/lib/types';
import MonthlySpendingTrend from './trends/MonthlySpendingTrend';
import CategorySpendingTrends from './trends/CategorySpendingTrends';
import BudgetVsActualTrend from './trends/BudgetVsActualTrend';
import SpendingVelocityTrend from './trends/SpendingVelocityTrend';
import MerchantSpendingTrends from './trends/MerchantSpendingTrends';

export default function TrendsPage() {
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [timeRange, setTimeRange] = useState('12'); // months to show

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingTransactionsRef = useRef(false);
  const fetchingCategoriesRef = useRef(false);
  const hasMountedTransactionsRef = useRef(false);
  const hasMountedCategoriesRef = useRef(false);

  // Fetch transactions with date filtering based on time range to avoid Supabase limit
  useEffect(() => {
    const fetchTransactions = async () => {
      // Prevent duplicate calls
      if (fetchingTransactionsRef.current) {
        return;
      }
      fetchingTransactionsRef.current = true;

      try {
        setLoadingTransactions(true);
        
        // Calculate date range based on selected time range
        const monthsToShow = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsToShow);
        const startDate = cutoffDate.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        // Build transactions URL with date filters
        const transactionsUrl = new URL('/api/transactions', window.location.origin);
        transactionsUrl.searchParams.set('startDate', startDate);
        transactionsUrl.searchParams.set('endDate', today);
        
        const response = await fetch(transactionsUrl.toString());
        
        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ensure data is always an array
        if (Array.isArray(data)) {
          setTransactions(data);
        } else {
          console.error('Invalid transactions data:', data);
          setTransactions([]);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]); // Set empty array on error
      } finally {
        setLoadingTransactions(false);
        fetchingTransactionsRef.current = false;
      }
    };

    fetchTransactions();
  }, [timeRange]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      // Prevent duplicate calls
      if (fetchingCategoriesRef.current || hasMountedCategoriesRef.current) {
        return;
      }
      hasMountedCategoriesRef.current = true;
      fetchingCategoriesRef.current = true;

      try {
        setLoadingCategories(true);
        const response = await fetch('/api/categories?includeArchived=all');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ensure data is always an array
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error('Invalid categories data:', data);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]); // Set empty array on error
      } finally {
        setLoadingCategories(false);
        fetchingCategoriesRef.current = false;
      }
    };

    fetchCategories();
  }, []);

  // Transactions are already filtered by date range in the API call
  // No need for additional client-side filtering
  const filteredTransactions = useMemo(() => {
    // Ensure transactions is always an array
    if (!Array.isArray(transactions)) {
      return [];
    }
    return transactions;
  }, [transactions]);

  const loading = loadingTransactions || loadingCategories;

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
        <h1 className="text-2xl md:text-3xl font-bold">Spending Trends</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your spending patterns and trends over time
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger id="time-range" className="w-[160px] md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 Months</SelectItem>
            <SelectItem value="6">Last 6 Months</SelectItem>
            <SelectItem value="12">Last 12 Months</SelectItem>
            <SelectItem value="24">Last 24 Months</SelectItem>
            <SelectItem value="36">Last 36 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Spending Trend */}
      <MonthlySpendingTrend
        transactions={filteredTransactions}
        categories={categories}
      />

      {/* Budget vs Actual */}
      <BudgetVsActualTrend
        transactions={filteredTransactions}
        categories={categories}
      />

      {/* Category Spending Trends */}
      <CategorySpendingTrends
        transactions={filteredTransactions}
        categories={categories}
      />

      {/* Spending Velocity */}
      <SpendingVelocityTrend
        transactions={filteredTransactions}
        categories={categories}
      />

      {/* Merchant Spending Trends */}
      <MerchantSpendingTrends
        transactions={filteredTransactions}
        categories={categories}
      />
    </div>
  );
}


