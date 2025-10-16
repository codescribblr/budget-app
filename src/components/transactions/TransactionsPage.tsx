'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, X } from 'lucide-react';
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
        fetch('/api/categories'),
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

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions;
    }

    return transactions.filter(transaction => {
      // Search in description
      if (fuzzyMatch(transaction.description, searchQuery)) {
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
  }, [transactions, categories, searchQuery]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            Add Transaction
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <Separator />

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

