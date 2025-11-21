'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, X, Upload, Filter, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { TransactionWithSplits, Category, MerchantGroup } from '@/lib/types';
import TransactionList from './TransactionList';
import AddTransactionDialog from './AddTransactionDialog';
import EditTransactionDialog from './EditTransactionDialog';
import { format } from 'date-fns';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';

// Fuzzy search function
function fuzzyMatch(text: string, search: string): boolean {
  const textLower = text.toLowerCase();
  const searchLower = search.toLowerCase();

  // Exact substring match
  if (textLower.includes(searchLower)) {
    return true;
  }

  // Fuzzy match - all characters in search must appear in order in text
  let searchIndex = 0;
  for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
    if (textLower[i] === searchLower[searchIndex]) {
      searchIndex++;
    }
  }
  return searchIndex === searchLower.length;
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantFilter = searchParams.get('merchant');
  const merchantGroupIdParam = searchParams.get('merchantGroupId');
  const categoryIdParam = searchParams.get('categoryId');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const searchQueryParam = searchParams.get('q');
  const editIdParam = searchParams.get('editId');

  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantGroups, setMerchantGroups] = useState<MerchantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [merchantGroupName, setMerchantGroupName] = useState<string | null>(null);
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, categoriesRes, merchantGroupsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories?excludeGoals=true'),
        fetch('/api/merchant-groups'),
      ]);

      const [transactionsData, categoriesData, merchantGroupsData] = await Promise.all([
        transactionsRes.json(),
        categoriesRes.json(),
        merchantGroupsRes.json(),
      ]);

      setTransactions(transactionsData);
      setCategories(categoriesData);
      setMerchantGroups(merchantGroupsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize search query from URL parameter
  useEffect(() => {
    if (searchQueryParam) {
      setSearchQuery(searchQueryParam);
    }
  }, [searchQueryParam]);

  // Open edit dialog if editId is in URL
  useEffect(() => {
    if (editIdParam && transactions.length > 0 && !isEditDialogOpen) {
      const transactionId = parseInt(editIdParam);
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        setEditingTransaction(transaction);
        setIsEditDialogOpen(true);

        // Remove editId from URL after opening dialog
        const params = new URLSearchParams(searchParams.toString());
        params.delete('editId');
        const newUrl = params.toString() ? `/transactions?${params.toString()}` : '/transactions';
        router.replace(newUrl);
      }
    }
  }, [editIdParam, transactions, isEditDialogOpen, searchParams, router]);

  // Initialize date objects from URL parameters
  useEffect(() => {
    if (startDateParam) {
      setStartDateObj(parseLocalDate(startDateParam));
    } else {
      setStartDateObj(undefined);
    }
    if (endDateParam) {
      setEndDateObj(parseLocalDate(endDateParam));
    } else {
      setEndDateObj(undefined);
    }
  }, [startDateParam, endDateParam]);

  // Fetch merchant group name if merchantGroupId is provided
  useEffect(() => {
    const fetchMerchantGroupName = async () => {
      if (merchantGroupIdParam) {
        try {
          const response = await fetch(`/api/merchant-groups/${merchantGroupIdParam}`);
          if (response.ok) {
            const group = await response.json();
            setMerchantGroupName(group.display_name);
          }
        } catch (error) {
          console.error('Error fetching merchant group:', error);
        }
      } else {
        setMerchantGroupName(null);
      }
    };

    fetchMerchantGroupName();
  }, [merchantGroupIdParam]);

  // Filter transactions based on all filters and search query
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply merchant filter if present
    if (merchantFilter) {
      filtered = filtered.filter(transaction => {
        // Compare with null check
        if (!transaction.merchant_name) return false;
        return transaction.merchant_name === merchantFilter;
      });
    }

    // Apply merchant group filter if present
    if (merchantGroupIdParam) {
      const merchantGroupId = parseInt(merchantGroupIdParam);
      filtered = filtered.filter(transaction => {
        return transaction.merchant_group_id === merchantGroupId;
      });
    }

    // Apply category filter if present
    if (categoryIdParam) {
      const categoryId = parseInt(categoryIdParam);
      filtered = filtered.filter(transaction => {
        return transaction.splits.some(split => split.category_id === categoryId);
      });
    }

    // Apply date range filter if present (inclusive of both start and end dates)
    if (startDateParam || endDateParam) {
      filtered = filtered.filter(transaction => {
        const transactionDate = transaction.date; // YYYY-MM-DD format
        if (startDateParam && transactionDate < startDateParam) return false;
        if (endDateParam && transactionDate > endDateParam) return false;
        return true;
      });
    }

    // Then apply search query filter
    if (!searchQuery.trim()) {
      return filtered;
    }

    return filtered.filter(transaction => {
      // Search in description
      if (fuzzyMatch(transaction.description, searchQuery)) {
        return true;
      }

      // Search in merchant name
      if (transaction.merchant_name && fuzzyMatch(transaction.merchant_name, searchQuery)) {
        return true;
      }

      // Search in category names
      const categoryNames = transaction.splits
        .map(split => {
          const category = categories.find(c => c.id === split.category_id);
          return category?.name || '';
        })
        .join(' ');

      if (fuzzyMatch(categoryNames, searchQuery)) {
        return true;
      }

      // Search in amount (convert to string)
      const amountStr = transaction.total_amount.toString();
      if (fuzzyMatch(amountStr, searchQuery)) {
        return true;
      }

      // Search in date
      if (fuzzyMatch(transaction.date, searchQuery)) {
        return true;
      }

      return false;
    });
  }, [transactions, categories, searchQuery, merchantFilter, merchantGroupIdParam, categoryIdParam, startDateParam, endDateParam]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleClearMerchantFilter = () => {
    router.push('/transactions');
  };

  const handleClearFilters = () => {
    router.push('/transactions');
    setStartDateObj(undefined);
    setEndDateObj(undefined);
  };

  const updateFilters = (updates: {
    categoryId?: string | null;
    merchantGroupId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove each parameter
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/transactions?${params.toString()}`);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    updateFilters({ categoryId });
  };

  const handleMerchantGroupChange = (merchantGroupId: string | null) => {
    updateFilters({ merchantGroupId });
  };

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDateObj(start);
    setEndDateObj(end);
    updateFilters({
      startDate: start ? format(start, 'yyyy-MM-dd') : null,
      endDate: end ? format(end, 'yyyy-MM-dd') : null,
    });
  };

  const hasFilters = merchantFilter || merchantGroupIdParam || categoryIdParam || startDateParam || endDateParam;
  const selectedCategory = categoryIdParam ? categories.find(c => c.id === parseInt(categoryIdParam)) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mt-2">
              {merchantFilter && (
                <Badge variant="secondary">
                  Merchant: {merchantFilter}
                </Badge>
              )}
              {merchantGroupName && (
                <Badge variant="secondary">
                  Merchant Group: {merchantGroupName}
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary">
                  Category: {selectedCategory.name}
                </Badge>
              )}
              {(startDateParam || endDateParam) && (
                <Badge variant="secondary">
                  Date: {startDateParam || '...'} to {endDateParam || '...'}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="outline" onClick={handleClearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/import">
              <Upload className="mr-2 h-4 w-4" />
              Import Transactions
            </Link>
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Filter className="mr-2 h-4 w-4" />
                  Category
                  {categoryIdParam && <Badge variant="secondary" className="ml-2">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!categoryIdParam}
                  onCheckedChange={() => handleCategoryChange(null)}
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                {categories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category.id}
                    checked={categoryIdParam === category.id.toString()}
                    onCheckedChange={(checked) => {
                      handleCategoryChange(checked ? category.id.toString() : null);
                    }}
                  >
                    {category.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Merchant Group Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Filter className="mr-2 h-4 w-4" />
                  Merchant
                  {merchantGroupIdParam && <Badge variant="secondary" className="ml-2">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filter by merchant</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!merchantGroupIdParam}
                  onCheckedChange={() => handleMerchantGroupChange(null)}
                >
                  All Merchants
                </DropdownMenuCheckboxItem>
                {merchantGroups.map((group) => (
                  <DropdownMenuCheckboxItem
                    key={group.id}
                    checked={merchantGroupIdParam === group.id.toString()}
                    onCheckedChange={(checked) => {
                      handleMerchantGroupChange(checked ? group.id.toString() : null);
                    }}
                  >
                    {group.display_name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Date
                  {(startDateParam || endDateParam) && <Badge variant="secondary" className="ml-2">1</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={startDateObj}
                      onSelect={(date) => handleDateRangeChange(date, endDateObj)}
                      initialFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Calendar
                      mode="single"
                      selected={endDateObj}
                      onSelect={(date) => handleDateRangeChange(startDateObj, date)}
                    />
                  </div>
                  {(startDateObj || endDateObj) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDateRangeChange(undefined, undefined)}
                    >
                      Clear Dates
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {(searchQuery || hasFilters) && (
            <p className="text-sm text-muted-foreground mb-4">
              Found {filteredTransactions.length} of {transactions.length} transactions
            </p>
          )}

          <TransactionList
            transactions={filteredTransactions}
            categories={categories}
            onUpdate={fetchData}
          />
        </CardContent>
      </Card>

      <AddTransactionDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        categories={categories}
        onSuccess={fetchData}
      />

      {editingTransaction && (
        <EditTransactionDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          categories={categories}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

