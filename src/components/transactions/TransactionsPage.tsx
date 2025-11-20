'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TransactionWithSplits, Category } from '@/lib/types';
import TransactionList from './TransactionList';
import AddTransactionDialog from './AddTransactionDialog';
import AppHeader from '@/components/layout/AppHeader';

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

  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter transactions based on merchant filter and search query
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // First apply merchant filter if present
    if (merchantFilter) {
      filtered = filtered.filter(transaction => {
        // Compare with null check
        if (!transaction.merchant_name) return false;
        return transaction.merchant_name === merchantFilter;
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
  }, [transactions, categories, searchQuery, merchantFilter]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleClearMerchantFilter = () => {
    router.push('/transactions');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader
        title="Transactions"
        subtitle={merchantFilter ? `Filtered by merchant: ${merchantFilter}` : undefined}
        actions={
          <>
            {merchantFilter && (
              <Button variant="outline" onClick={handleClearMerchantFilter}>
                <X className="mr-2 h-4 w-4" />
                Clear Filter
              </Button>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)}>
              Add Transaction
            </Button>
          </>
        }
      />

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

