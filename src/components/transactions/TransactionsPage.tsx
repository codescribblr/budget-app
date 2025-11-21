'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, X, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TransactionWithSplits, Category } from '@/lib/types';
import TransactionList from './TransactionList';
import AddTransactionDialog from './AddTransactionDialog';

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

  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [merchantGroupName, setMerchantGroupName] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories?excludeGoals=true'),
      ]);

      const [transactionsData, categoriesData] = await Promise.all([
        transactionsRes.json(),
        categoriesRes.json(),
      ]);

      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      {/* Search Box */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search transactions (description, category, amount, date)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredTransactions.length} of {transactions.length} transactions
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
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
    </div>
  );
}

