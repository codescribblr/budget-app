'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { TransactionWithSplits, Category } from '@/lib/types';
import MonthlySpendingTrend from './trends/MonthlySpendingTrend';
import CategorySpendingTrends from './trends/CategorySpendingTrends';
import BudgetVsActualTrend from './trends/BudgetVsActualTrend';
import SpendingVelocityTrend from './trends/SpendingVelocityTrend';
import MerchantSpendingTrends from './trends/MerchantSpendingTrends';
import AppHeader from '@/components/layout/AppHeader';

export default function TrendsPage() {
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [timeRange, setTimeRange] = useState('12'); // months to show

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

  // Filter transactions by time range
  const filteredTransactions = useMemo(() => {
    const monthsToShow = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToShow);

    // Convert cutoff date to YYYY-MM-DD string for consistent comparison
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    return transactions.filter(t => t.date >= cutoffDateString);
  }, [transactions, timeRange]);

  const loading = loadingTransactions || loadingCategories;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader
        title="Spending Trends"
        subtitle="Analyze your spending patterns and trends over time"
      />

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter your trend data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Time Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="time-range">Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger id="time-range">
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
            </div>
          </div>
        </CardContent>
      </Card>

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

