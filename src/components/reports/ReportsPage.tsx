'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { TransactionWithSplits, Category } from '@/lib/types';
import SpendingByCategory from './SpendingByCategory';
import SpendingPieChart from './SpendingPieChart';
import TransactionsByMerchant from './TransactionsByMerchant';
import { X } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('all');

  // Category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // System category toggle for merchants
  const [includeSystemCategories, setIncludeSystemCategories] = useState(false);

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

  useEffect(() => {
    // Set date range based on selection
    const today = new Date();
    const end = today.toISOString().split('T')[0];

    switch (dateRange) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(end);
        break;
      case 'month':
        // Previous calendar month
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonth.toISOString().split('T')[0]);
        setEndDate(lastMonthEnd.toISOString().split('T')[0]);
        break;
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        setStartDate(quarterAgo.toISOString().split('T')[0]);
        setEndDate(end);
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        setStartDate(yearAgo.toISOString().split('T')[0]);
        setEndDate(end);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  }, [dateRange]);

  const filteredTransactions = transactions.filter(t => {
    // Date filter
    if (startDate || endDate) {
      const transactionDate = new Date(t.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && transactionDate < start) return false;
      if (end && transactionDate > end) return false;
    }

    // Category filter
    if (selectedCategoryId !== null) {
      return t.splits.some(split => split.category_id === selectedCategoryId);
    }

    return true;
  });

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Spending Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analyze your spending patterns and trends
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          Back to Dashboard
        </Button>
      </div>

      <Separator />

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
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
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
                    setStartDate(e.target.value);
                    setDateRange('custom');
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
                    setEndDate(e.target.value);
                    setDateRange('custom');
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
                  onValueChange={(value) => setSelectedCategoryId(value === 'all' ? null : parseInt(value))}
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
        />
        <SpendingPieChart
          transactions={filteredTransactions}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryClick={handleCategoryClick}
          loading={loadingTransactions || loadingCategories}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <TransactionsByMerchant
          transactions={filteredTransactions}
          categories={categories}
          includeSystemCategories={includeSystemCategories}
          loading={loadingTransactions || loadingCategories}
        />
      </div>
    </div>
  );
}

