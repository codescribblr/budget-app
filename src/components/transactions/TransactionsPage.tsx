'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, X, Upload, Filter, CalendarIcon, Copy, ArrowUpDown, ArrowUp, ArrowDown, Tag as TagIcon } from 'lucide-react';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TransactionWithSplits, Category, MerchantGroup, Tag, Account, CreditCard } from '@/lib/types';
import TransactionList from './TransactionList';
import AddTransactionDialog from './AddTransactionDialog';
import EditTransactionDialog from './EditTransactionDialog';
import { format } from 'date-fns';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';
import { useFeature } from '@/contexts/FeatureContext';

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
  
  // Parse multi-select filters (comma-separated values)
  const merchantGroupIdParam = searchParams.get('merchantGroupId');
  const merchantGroupIds = merchantGroupIdParam 
    ? merchantGroupIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [];
  
  const categoryIdParam = searchParams.get('categoryId');
  const categoryIds = categoryIdParam 
    ? categoryIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [];
  
  const transactionTypeParam = searchParams.get('transactionType');
  const transactionTypes = transactionTypeParam 
    ? transactionTypeParam.split(',').filter(t => t === 'income' || t === 'expense') as ('income' | 'expense')[]
    : [];
  
  const tagsParam = searchParams.get('tags');
  const tagIds = tagsParam 
    ? tagsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [];
  
  // Parse account filter (supports both account IDs and credit card IDs)
  // Format: "account-1,account-2,card-3" where account-X is account ID and card-X is credit card ID
  const accountFilterParam = searchParams.get('accountId');
  const accountFilterIds = accountFilterParam 
    ? accountFilterParam.split(',').map(item => {
        const trimmed = item.trim();
        if (trimmed.startsWith('account-')) {
          const id = parseInt(trimmed.replace('account-', ''));
          return !isNaN(id) ? { type: 'account' as const, id } : null;
        } else if (trimmed.startsWith('card-')) {
          const id = parseInt(trimmed.replace('card-', ''));
          return !isNaN(id) ? { type: 'card' as const, id } : null;
        }
        return null;
      }).filter((item): item is { type: 'account' | 'card'; id: number } => item !== null)
    : [];
  
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const searchQueryParam = searchParams.get('q');
  const editIdParam = searchParams.get('editId');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantGroups, setMerchantGroups] = useState<MerchantGroup[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'description' | 'merchant' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const tagsEnabled = useFeature('tags');

  // Initialize pagination state with values from URL params or defaults
  const [currentPage, setCurrentPage] = useState(() => {
    if (pageParam) {
      const page = parseInt(pageParam);
      return !isNaN(page) && page > 0 ? page : 1;
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    if (pageSizeParam) {
      const size = parseInt(pageSizeParam);
      return !isNaN(size) && size > 0 ? size : 50;
    }
    return 50;
  });

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    try {
      setLoading(true);
      // Use regular fetch - the cache will be handled at a higher level
      // We'll prevent duplicate calls by using a ref to track if fetch is in progress
      const fetchPromises = [
        fetch('/api/transactions'),
        fetch('/api/categories?excludeGoals=true'),
        fetch('/api/merchant-groups'),
        fetch('/api/accounts'),
        fetch('/api/credit-cards'),
      ];
      
      if (tagsEnabled) {
        fetchPromises.push(fetch('/api/tags'));
      }

      const responses = await Promise.all(fetchPromises);
      const [transactionsRes, categoriesRes, merchantGroupsRes, accountsRes, creditCardsRes, ...tagResArray] = responses;

      const [transactionsData, categoriesData, merchantGroupsData, accountsData, creditCardsData] = await Promise.all([
        transactionsRes.ok ? transactionsRes.json() : [],
        categoriesRes.ok ? categoriesRes.json() : [],
        merchantGroupsRes.ok ? merchantGroupsRes.json() : [],
        accountsRes.ok ? accountsRes.json() : [],
        creditCardsRes.ok ? creditCardsRes.json() : [],
      ]);

      let tagsData: Tag[] = [];
      if (tagsEnabled && tagResArray.length > 0) {
        tagsData = tagResArray[0].ok ? await tagResArray[0].json() : [];
      }

      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setMerchantGroups(Array.isArray(merchantGroupsData) ? merchantGroupsData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setCreditCards(Array.isArray(creditCardsData) ? creditCardsData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setTransactions([]);
      setCategories([]);
      setMerchantGroups([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Track if component has mounted to prevent duplicate calls
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // Only fetch once on mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchData();
    }
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

  // Update pagination when URL params change
  useEffect(() => {
    if (pageParam) {
      const page = parseInt(pageParam);
      if (!isNaN(page) && page > 0 && page !== currentPage) {
        setCurrentPage(page);
      }
    }
  }, [pageParam]);

  useEffect(() => {
    if (pageSizeParam) {
      const size = parseInt(pageSizeParam);
      if (!isNaN(size) && size > 0 && size !== pageSize) {
        setPageSize(size);
      }
    }
  }, [pageSizeParam]);

  // No longer needed - we use merchantGroups array directly

  // Filter transactions based on all filters and search query
  const filteredTransactions = useMemo(() => {
    // Ensure transactions is always an array
    if (!Array.isArray(transactions)) {
      return [];
    }
    let filtered = transactions;

    // Apply merchant filter if present
    if (merchantFilter) {
      filtered = filtered.filter(transaction => {
        // Compare with null check
        if (!transaction.merchant_name) return false;
        return transaction.merchant_name === merchantFilter;
      });
    }

    // Apply merchant group filter if present (multi-select)
    if (merchantGroupIds.length > 0) {
      filtered = filtered.filter(transaction => {
        return transaction.merchant_group_id !== null && 
               transaction.merchant_group_id !== undefined &&
               merchantGroupIds.includes(transaction.merchant_group_id);
      });
    }

    // Apply category filter if present (multi-select)
    if (categoryIds.length > 0) {
      filtered = filtered.filter(transaction => {
        return transaction.splits.some(split => categoryIds.includes(split.category_id));
      });
    }

    // Apply transaction type filter if present (multi-select)
    if (transactionTypes.length > 0) {
      filtered = filtered.filter(transaction => {
        return transactionTypes.includes(transaction.transaction_type);
      });
    }

    // Apply tag filter if present (multi-select - transaction must have all selected tags)
    if (tagIds.length > 0) {
      filtered = filtered.filter(transaction => {
        const transactionTagIds = transaction.tags?.map(t => t.id) || [];
        // Transaction must have all selected tags (AND logic)
        return tagIds.every(tagId => transactionTagIds.includes(tagId));
      });
    }

    // Apply account filter if present (multi-select - supports both accounts and credit cards)
    if (accountFilterIds.length > 0) {
      filtered = filtered.filter(transaction => {
        return accountFilterIds.some(filter => {
          if (filter.type === 'account') {
            return transaction.account_id === filter.id;
          } else if (filter.type === 'card') {
            return transaction.credit_card_id === filter.id;
          }
          return false;
        });
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

      // Search in tag names
      const tagNames = (transaction.tags || [])
        .map(tag => tag.name)
        .join(' ');

      if (fuzzyMatch(tagNames, searchQuery)) {
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
  }, [transactions, categories, searchQuery, merchantFilter, merchantGroupIds, categoryIds, transactionTypes, tagIds, accountFilterIds, startDateParam, endDateParam]);

  // Sort filtered transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          // Compare dates (YYYY-MM-DD format sorts correctly as strings)
          comparison = a.date.localeCompare(b.date);
          // If same date, sort by ID for consistency
          if (comparison === 0) {
            comparison = a.id - b.id;
          }
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description, undefined, { sensitivity: 'base' });
          break;
        case 'merchant':
          const merchantA = a.merchant_name || '';
          const merchantB = b.merchant_name || '';
          comparison = merchantA.localeCompare(merchantB, undefined, { sensitivity: 'base' });
          break;
        case 'amount':
          comparison = a.total_amount - b.total_amount;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredTransactions, sortBy, sortDirection]);

  // Calculate pagination
  const totalTransactions = sortedTransactions.length;
  const totalPages = Math.ceil(totalTransactions / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Handle sort change
  const handleSort = (column: 'date' | 'description' | 'merchant' | 'amount') => {
    if (sortBy === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      updatePagination(1);
    }
  }, [currentPage, totalPages]);

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
    categoryId?: number[] | null;
    merchantGroupId?: number[] | null;
    transactionType?: ('income' | 'expense')[] | null;
    tags?: number[] | null;
    accountId?: Array<{ type: 'account' | 'card'; id: number }> | null;
    startDate?: string | null;
    endDate?: string | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove each parameter
    if (updates.categoryId !== undefined) {
      if (updates.categoryId && updates.categoryId.length > 0) {
        params.set('categoryId', updates.categoryId.join(','));
      } else {
        params.delete('categoryId');
      }
    }
    if (updates.merchantGroupId !== undefined) {
      if (updates.merchantGroupId && updates.merchantGroupId.length > 0) {
        params.set('merchantGroupId', updates.merchantGroupId.join(','));
      } else {
        params.delete('merchantGroupId');
      }
    }
    if (updates.transactionType !== undefined) {
      if (updates.transactionType && updates.transactionType.length > 0) {
        params.set('transactionType', updates.transactionType.join(','));
      } else {
        params.delete('transactionType');
      }
    }
    if (updates.tags !== undefined) {
      if (updates.tags && updates.tags.length > 0) {
        params.set('tags', updates.tags.join(','));
      } else {
        params.delete('tags');
      }
    }
    if (updates.accountId !== undefined) {
      if (updates.accountId && updates.accountId.length > 0) {
        const accountFilterString = updates.accountId.map(item => 
          item.type === 'account' ? `account-${item.id}` : `card-${item.id}`
        ).join(',');
        params.set('accountId', accountFilterString);
      } else {
        params.delete('accountId');
      }
    }
    if (updates.startDate !== undefined) {
      if (updates.startDate) {
        params.set('startDate', updates.startDate);
      } else {
        params.delete('startDate');
      }
    }
    if (updates.endDate !== undefined) {
      if (updates.endDate) {
        params.set('endDate', updates.endDate);
      } else {
        params.delete('endDate');
      }
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`/transactions?${params.toString()}`);
  };

  const updatePagination = (page: number, size?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    if (size !== undefined) {
      params.set('pageSize', size.toString());
    }
    router.push(`/transactions?${params.toString()}`);
  };

  const handleCategoryToggle = (categoryId: number) => {
    const newCategoryIds = categoryIds.includes(categoryId)
      ? categoryIds.filter(id => id !== categoryId)
      : [...categoryIds, categoryId];
    updateFilters({ categoryId: newCategoryIds.length > 0 ? newCategoryIds : null });
  };

  const handleMerchantGroupToggle = (merchantGroupId: number) => {
    const newMerchantGroupIds = merchantGroupIds.includes(merchantGroupId)
      ? merchantGroupIds.filter(id => id !== merchantGroupId)
      : [...merchantGroupIds, merchantGroupId];
    updateFilters({ merchantGroupId: newMerchantGroupIds.length > 0 ? newMerchantGroupIds : null });
  };

  const handleTransactionTypeToggle = (transactionType: 'income' | 'expense') => {
    const newTransactionTypes = transactionTypes.includes(transactionType)
      ? transactionTypes.filter(t => t !== transactionType)
      : [...transactionTypes, transactionType];
    updateFilters({ transactionType: newTransactionTypes.length > 0 ? newTransactionTypes : null });
  };

  const handleTagToggle = (tagId: number) => {
    const newTagIds = tagIds.includes(tagId)
      ? tagIds.filter(id => id !== tagId)
      : [...tagIds, tagId];
    updateFilters({ tags: newTagIds.length > 0 ? newTagIds : null });
  };

  const handleAccountToggle = (type: 'account' | 'card', id: number) => {
    const filterKey = type === 'account' ? { type: 'account' as const, id } : { type: 'card' as const, id };
    const isSelected = accountFilterIds.some(f => f.type === filterKey.type && f.id === filterKey.id);
    const newAccountFilterIds = isSelected
      ? accountFilterIds.filter(f => !(f.type === filterKey.type && f.id === filterKey.id))
      : [...accountFilterIds, filterKey];
    updateFilters({ accountId: newAccountFilterIds.length > 0 ? newAccountFilterIds : null });
  };

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDateObj(start);
    setEndDateObj(end);
    updateFilters({
      startDate: start ? format(start, 'yyyy-MM-dd') : null,
      endDate: end ? format(end, 'yyyy-MM-dd') : null,
    });
  };

  const hasFilters = merchantFilter || merchantGroupIds.length > 0 || categoryIds.length > 0 || transactionTypes.length > 0 || tagIds.length > 0 || accountFilterIds.length > 0 || startDateParam || endDateParam;
  const selectedCategories = categoryIds.map(id => categories.find(c => c.id === id)).filter(Boolean) as Category[];
  const selectedMerchantGroups = merchantGroupIds.map(id => merchantGroups.find(g => g.id === id)).filter(Boolean) as MerchantGroup[];
  const selectedTags = tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[];
  const selectedAccounts = accountFilterIds.filter(f => f.type === 'account').map(f => accounts.find(a => a.id === f.id)).filter(Boolean) as Account[];
  const selectedCreditCards = accountFilterIds.filter(f => f.type === 'card').map(f => creditCards.find(c => c.id === f.id)).filter(Boolean) as CreditCard[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mt-2">
                {merchantFilter && (
                  <Badge variant="secondary">
                    Merchant: {merchantFilter}
                  </Badge>
                )}
                {selectedMerchantGroups.map((group) => (
                  <Badge key={group.id} variant="secondary">
                    Merchant: {group.display_name}
                  </Badge>
                ))}
                {selectedCategories.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    Category: {category.name}
                  </Badge>
                ))}
                {transactionTypes.map((type) => (
                  <Badge key={type} variant="secondary">
                    Type: {type === 'income' ? 'Income' : 'Expense'}
                  </Badge>
                ))}
                {selectedTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="cursor-pointer" onClick={() => handleTagToggle(tag.id)}>
                    {tag.color && (
                      <div
                        className="w-2 h-2 rounded-full mr-1 inline-block"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    Tag: {tag.name}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
                {selectedAccounts.map((account) => {
                  const filterId = accountFilterIds.find(f => f.type === 'account' && f.id === account.id);
                  return filterId ? (
                    <Badge key={`account-${account.id}`} variant="secondary" className="cursor-pointer" onClick={() => handleAccountToggle('account', account.id)}>
                      Account: {account.name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ) : null;
                })}
                {selectedCreditCards.map((card) => {
                  const filterId = accountFilterIds.find(f => f.type === 'card' && f.id === card.id);
                  return filterId ? (
                    <Badge key={`card-${card.id}`} variant="secondary" className="cursor-pointer" onClick={() => handleAccountToggle('card', card.id)}>
                      Card: {card.name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ) : null;
                })}
                {(startDateParam || endDateParam) && (
                  <Badge variant="secondary">
                    Date: {startDateParam || '...'} to {endDateParam || '...'}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {hasFilters && (
              <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/import">
                <Upload className="mr-2 h-4 w-4" />
                Import Transactions
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/transactions/duplicates">
                <Copy className="mr-2 h-4 w-4" />
                Find Duplicates
              </Link>
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
              Add Transaction
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Search and Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
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

            {/* Filters Row - wraps on mobile */}
            <div className="flex flex-wrap gap-2">
              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
                    <Filter className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Category</span>
                    <span className="sm:hidden">Cat.</span>
                    {categoryIds.length > 0 && <Badge variant="secondary" className="ml-2">{categoryIds.length}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={categoryIds.length === 0}
                  onCheckedChange={() => {
                    if (categoryIds.length > 0) {
                      updateFilters({ categoryId: null });
                    }
                  }}
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                {categories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category.id}
                    checked={categoryIds.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  >
                    {category.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

              {/* Merchant Group Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
                    <Filter className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Merchant</span>
                    <span className="sm:hidden">Merch.</span>
                    {merchantGroupIds.length > 0 && <Badge variant="secondary" className="ml-2">{merchantGroupIds.length}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Filter by merchant</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={merchantGroupIds.length === 0}
                    onCheckedChange={() => {
                      if (merchantGroupIds.length > 0) {
                        updateFilters({ merchantGroupId: null });
                      }
                    }}
                  >
                    All Merchants
                  </DropdownMenuCheckboxItem>
                  {merchantGroups.map((group) => (
                    <DropdownMenuCheckboxItem
                      key={group.id}
                      checked={merchantGroupIds.includes(group.id)}
                      onCheckedChange={() => handleMerchantGroupToggle(group.id)}
                    >
                      {group.display_name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Transaction Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
                    <Filter className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Type</span>
                    <span className="sm:hidden">Type</span>
                    {transactionTypes.length > 0 && <Badge variant="secondary" className="ml-2">{transactionTypes.length}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={transactionTypes.length === 0}
                    onCheckedChange={() => {
                      if (transactionTypes.length > 0) {
                        updateFilters({ transactionType: null });
                      }
                    }}
                  >
                    All Types
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={transactionTypes.includes('income')}
                    onCheckedChange={() => handleTransactionTypeToggle('income')}
                  >
                    Income
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={transactionTypes.includes('expense')}
                    onCheckedChange={() => handleTransactionTypeToggle('expense')}
                  >
                    Expense
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tag Filter */}
              {tagsEnabled && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
                      <TagIcon className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Tags</span>
                      <span className="sm:hidden">Tags</span>
                      {tagIds.length > 0 && <Badge variant="secondary" className="ml-2">{tagIds.length}</Badge>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Filter by tags</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={tagIds.length === 0}
                      onCheckedChange={() => {
                        if (tagIds.length > 0) {
                          updateFilters({ tags: null });
                        }
                      }}
                    >
                      All Tags
                    </DropdownMenuCheckboxItem>
                    {tags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={tagIds.includes(tag.id)}
                        onCheckedChange={() => handleTagToggle(tag.id)}
                      >
                        <div className="flex items-center gap-2">
                          {tag.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                          {tag.name}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Account Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
                    <Filter className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Account</span>
                    <span className="sm:hidden">Acct.</span>
                    {accountFilterIds.length > 0 && <Badge variant="secondary" className="ml-2">{accountFilterIds.length}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Filter by account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={accountFilterIds.length === 0}
                    onCheckedChange={() => {
                      if (accountFilterIds.length > 0) {
                        updateFilters({ accountId: null });
                      }
                    }}
                  >
                    All Accounts
                  </DropdownMenuCheckboxItem>
                  {accounts.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Accounts</DropdownMenuLabel>
                      {accounts.map((account) => {
                        const isSelected = accountFilterIds.some(f => f.type === 'account' && f.id === account.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={`account-${account.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleAccountToggle('account', account.id)}
                          >
                            {account.name}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </>
                  )}
                  {creditCards.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Credit Cards</DropdownMenuLabel>
                      {creditCards.map((card) => {
                        const isSelected = accountFilterIds.some(f => f.type === 'card' && f.id === card.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={`card-${card.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleAccountToggle('card', card.id)}
                          >
                            {card.name}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Range Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
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
          </div>

          {(searchQuery || hasFilters) && (
            <p className="text-sm text-muted-foreground mb-4">
              Found {filteredTransactions.length} of {transactions.length} transactions
            </p>
          )}

          <TransactionList
            transactions={paginatedTransactions}
            categories={categories}
            onUpdate={fetchData}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          {/* Pagination Controls */}
          {totalTransactions > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Pagination Info and Page Size Selector */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-muted-foreground w-full sm:w-auto">
                <div className="text-center sm:text-left">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalTransactions)} of {totalTransactions}
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Rows per page:</span>
                  <span className="sm:hidden">Per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      const newSize = parseInt(value);
                      setPageSize(newSize);
                      updatePagination(1, newSize);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pagination Buttons */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            updatePagination(currentPage - 1);
                          }
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                      if (showEllipsisBefore) {
                        return (
                          <PaginationItem key={`ellipsis-before-${page}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      if (showEllipsisAfter) {
                        return (
                          <PaginationItem key={`ellipsis-after-${page}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      if (!showPage) {
                        return null;
                      }

                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              updatePagination(page);
                            }}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            updatePagination(currentPage + 1);
                          }
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
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
          merchantGroups={merchantGroups}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

