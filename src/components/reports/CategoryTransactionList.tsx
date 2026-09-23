'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import type { Account, Category, CreditCard, TransactionWithSplits } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TransactionCategorySelectLabel } from '@/components/transactions/TransactionCategorySelectLabel';
import EditTransactionDialog from '@/components/transactions/EditTransactionDialog';
import { handleApiError } from '@/lib/api-error-handler';
import { previousCalendarDay, splitsAfterCategoryMove } from '@/lib/category-transaction-edits';
import {
  filterCategoriesForTransactionSelect,
  sortCategoriesForTransactionSelect,
} from '@/lib/transaction-categories';
import { toast } from 'sonner';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';

interface CategoryTransactionListProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  selectedCategoryId: number | null;
  startDate?: string;
  endDate?: string;
  editable?: boolean;
  onUpdate?: () => void;
  initialCount?: number;
  loadMoreCount?: number;
  loadOlder?: boolean;
}

interface EditingField {
  transactionId: number;
  field: 'category' | 'account';
}

const DEFAULT_PAGE_SIZE = 50;

async function fetchOlderCategoryTransactions(options: {
  categoryId: number;
  endDate: string;
  knownIds: Set<number>;
  limit: number;
}): Promise<TransactionWithSplits[]> {
  const collected: TransactionWithSplits[] = [];
  let page = 1;

  while (collected.length < options.limit && page <= 40) {
    const url = new URL('/api/transactions', window.location.origin);
    url.searchParams.set('categoryId', String(options.categoryId));
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(options.limit));
    url.searchParams.set('endDate', options.endDate);
    url.searchParams.set('sortBy', 'date');
    url.searchParams.set('sortDirection', 'desc');

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load transactions');
    }

    const payload = await response.json();
    const batch: TransactionWithSplits[] = Array.isArray(payload)
      ? payload
      : payload.transactions ?? [];
    if (batch.length === 0) break;

    for (const transaction of batch) {
      if (options.knownIds.has(transaction.id)) continue;
      if (collected.some((item) => item.id === transaction.id)) continue;
      collected.push(transaction);
      if (collected.length >= options.limit) break;
    }

    if (batch.length < options.limit) break;
    page += 1;
  }

  return collected.slice(0, options.limit);
}

function accountSelectValue(transaction: TransactionWithSplits): string {
  if (transaction.account_id) return `account-${transaction.account_id}`;
  if (transaction.credit_card_id) return `card-${transaction.credit_card_id}`;
  return 'none';
}

function CategorySelect({
  value,
  categories,
  onChange,
  onClose,
}: {
  value: number;
  categories: Category[];
  onChange: (categoryId: number) => void;
  onClose: () => void;
}) {
  const ignoreClose = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      ignoreClose.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Select
        defaultOpen
        value={String(value)}
        onValueChange={(next) => {
          const categoryId = parseInt(next, 10);
          if (!Number.isNaN(categoryId)) onChange(categoryId);
        }}
        onOpenChange={(open) => {
          if (open) ignoreClose.current = false;
          if (!open && !ignoreClose.current) onClose();
        }}
      >
        <SelectTrigger className="h-8 min-w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              <TransactionCategorySelectLabel category={category} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AccountSelect({
  transaction,
  accounts,
  creditCards,
  onChange,
  onClose,
}: {
  transaction: TransactionWithSplits;
  accounts: Account[];
  creditCards: CreditCard[];
  onChange: (accountId: number | null, creditCardId: number | null) => void;
  onClose: () => void;
}) {
  const ignoreClose = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      ignoreClose.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Select
        defaultOpen
        value={accountSelectValue(transaction)}
        onValueChange={(value) => {
          if (value.startsWith('account-')) {
            const accountId = parseInt(value.slice('account-'.length), 10);
            if (!Number.isNaN(accountId)) onChange(accountId, null);
            return;
          }
          if (value.startsWith('card-')) {
            const creditCardId = parseInt(value.slice('card-'.length), 10);
            if (!Number.isNaN(creditCardId)) onChange(null, creditCardId);
            return;
          }
          onChange(null, null);
        }}
        onOpenChange={(open) => {
          if (open) ignoreClose.current = false;
          if (!open && !ignoreClose.current) onClose();
        }}
      >
        <SelectTrigger className="h-8 min-w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={`account-${account.id}`} value={`account-${account.id}`}>
              {account.name}
            </SelectItem>
          ))}
          {creditCards.map((card) => (
            <SelectItem key={`card-${card.id}`} value={`card-${card.id}`}>
              {card.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function CategoryTransactionList({
  transactions,
  categories,
  selectedCategoryId,
  startDate = '',
  endDate = '',
  editable = false,
  onUpdate,
  initialCount = DEFAULT_PAGE_SIZE,
  loadMoreCount = DEFAULT_PAGE_SIZE,
  loadOlder = false,
}: CategoryTransactionListProps) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [olderTransactions, setOlderTransactions] = useState<TransactionWithSplits[]>([]);
  const [noMoreOlder, setNoMoreOlder] = useState(!loadOlder || !startDate);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [localTransactions, setLocalTransactions] = useState<TransactionWithSplits[]>(transactions);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithSplits | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const savingIds = useRef(new Set<number>());

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    setDisplayCount(initialCount);
    setOlderTransactions([]);
    setNoMoreOlder(!loadOlder || !startDate);
  }, [selectedCategoryId, startDate, endDate, initialCount, loadOlder]);

  useEffect(() => {
    if (!editable) return;

    const loadAccounts = async () => {
      try {
        const [accountsResponse, cardsResponse] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/credit-cards'),
        ]);
        if (accountsResponse.ok) {
          const data = await accountsResponse.json();
          setAccounts(Array.isArray(data) ? data : []);
        }
        if (cardsResponse.ok) {
          const data = await cardsResponse.json();
          setCreditCards(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    };

    loadAccounts();
  }, [editable]);

  const sourceTransactions = editable ? localTransactions : transactions;

  const filteredTransactions = useMemo(() => {
    const byId = new Map<number, TransactionWithSplits>();
    for (const transaction of [...sourceTransactions, ...olderTransactions]) {
      byId.set(transaction.id, transaction);
    }

    return [...byId.values()].filter((transaction) =>
      transaction.splits.some((split) => split.category_id === selectedCategoryId)
    );
  }, [sourceTransactions, olderTransactions, selectedCategoryId]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return b.id - a.id;
    });
  }, [filteredTransactions]);

  const selectableCategories = useMemo(() => {
    return sortCategoriesForTransactionSelect(
      filterCategoriesForTransactionSelect(categories, {
        includeCategoryId: selectedCategoryId ?? undefined,
      })
    );
  }, [categories, selectedCategoryId]);

  const displayedTransactions = sortedTransactions.slice(0, displayCount);
  const moreInMemory = sortedTransactions.length > displayCount;
  const canFetchOlder = loadOlder && Boolean(startDate) && !noMoreOlder && selectedCategoryId !== null;
  const hasMore = moreInMemory || canFetchOlder;

  const handleLoadMore = async () => {
    if (isLoadingMore) return;

    const hiddenInMemory = Math.max(0, sortedTransactions.length - displayCount);
    const reveal = Math.min(loadMoreCount, hiddenInMemory);
    if (reveal > 0) {
      setDisplayCount((prev) => prev + reveal);
    }

    const stillNeeded = loadMoreCount - reveal;
    if (stillNeeded === 0 || !canFetchOlder || selectedCategoryId === null) return;

    const oldestLoadedDate = sortedTransactions[sortedTransactions.length - 1]?.date;
    const endDateForOlder = olderTransactions.length > 0 && oldestLoadedDate
      ? oldestLoadedDate
      : previousCalendarDay(startDate);

    setIsLoadingMore(true);
    try {
      const knownIds = new Set(sortedTransactions.map((transaction) => transaction.id));
      const older = await fetchOlderCategoryTransactions({
        categoryId: selectedCategoryId,
        endDate: endDateForOlder,
        knownIds,
        limit: stillNeeded,
      });

      if (older.length === 0) {
        setNoMoreOlder(true);
        return;
      }

      setOlderTransactions((prev) => [...prev, ...older]);
      setDisplayCount((prev) => prev + older.length);
      if (older.length < stillNeeded) {
        setNoMoreOlder(true);
      }
    } catch (error) {
      console.error('Error loading more transactions:', error);
      toast.error('Failed to load more transactions');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) || dateString;
  };

  const applyUpdatedTransaction = (updated: TransactionWithSplits) => {
    const merge = (item: TransactionWithSplits) => (
      item.id === updated.id ? { ...item, ...updated } : item
    );
    setLocalTransactions((prev) => prev.map(merge));
    setOlderTransactions((prev) => prev.map(merge));
  };

  const handleInlineCategoryChange = async (transaction: TransactionWithSplits, categoryId: number) => {
    if (!selectedCategoryId || savingIds.current.has(transaction.id)) return;

    const nextSplits = splitsAfterCategoryMove({
      splits: transaction.splits,
      totalAmount: transaction.total_amount,
      fromCategoryId: selectedCategoryId,
      toCategoryId: categoryId,
    });
    setEditingField(null);
    if (!nextSplits) return;

    const hadOtherCategories = transaction.splits.some((split) => split.category_id !== selectedCategoryId);
    const movedAmount = transaction.splits
      .filter((split) => split.category_id === selectedCategoryId)
      .reduce((sum, split) => sum + Number(split.amount), 0);
    const destinationName = categories.find((category) => category.id === categoryId)?.name ?? 'the new category';

    savingIds.current.add(transaction.id);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splits: nextSplits }),
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to update category');
        return;
      }

      const updated = await response.json();
      if (updated?.id) applyUpdatedTransaction(updated);
      const balanceNote = transaction.is_historical
        ? 'Envelope balances were left unchanged.'
        : 'Envelope balances were updated.';
      toast.success(
        hadOtherCategories
          ? `Moved ${formatCurrency(movedAmount)} to ${destinationName}. ${balanceNote}`
          : `Moved to ${destinationName}. ${balanceNote}`
      );
      onUpdate?.();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      savingIds.current.delete(transaction.id);
    }
  };

  const handleInlineAccountChange = async (
    transaction: TransactionWithSplits,
    accountId: number | null,
    creditCardId: number | null,
  ) => {
    if (savingIds.current.has(transaction.id)) return;

    const sameAccount = (transaction.account_id ?? null) === accountId
      && (transaction.credit_card_id ?? null) === creditCardId;
    setEditingField(null);
    if (sameAccount) return;

    savingIds.current.add(transaction.id);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          credit_card_id: creditCardId,
        }),
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to update account');
        return;
      }

      const updated = await response.json();
      if (updated?.id) applyUpdatedTransaction(updated);
      toast.success('Account updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    } finally {
      savingIds.current.delete(transaction.id);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete || savingIds.current.has(transactionToDelete.id)) return;

    const transactionId = transactionToDelete.id;
    savingIds.current.add(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        await handleApiError(response, 'Failed to delete transaction');
        return;
      }

      setLocalTransactions((prev) => prev.filter((item) => item.id !== transactionId));
      setOlderTransactions((prev) => prev.filter((item) => item.id !== transactionId));
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      toast.success('Transaction deleted');
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    } finally {
      savingIds.current.delete(transactionId);
    }
  };

  const startEditing = (transactionId: number, field: EditingField['field']) => {
    if (!editable) return;
    setEditingField({ transactionId, field });
  };

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const renderCategoryBadges = (transaction: TransactionWithSplits) => (
    <div className="flex flex-wrap gap-1">
      {transaction.splits.map((split) => {
        const category = categories.find((item) => item.id === split.category_id);
        const isSelectedCategory = split.category_id === selectedCategoryId;
        return (
          <Badge
            key={split.id}
            variant={isSelectedCategory ? 'default' : 'secondary'}
            className="text-xs whitespace-nowrap"
          >
            {category?.name || split.category_name || 'Unknown'}: {formatCurrency(split.amount)}
          </Badge>
        );
      })}
    </div>
  );

  const renderAccountLabel = (transaction: TransactionWithSplits) => {
    const name = transaction.account_name || transaction.credit_card_name;
    if (!name) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <Badge variant="outline" className="text-xs">
        {name}
      </Badge>
    );
  };

  const renderActions = (transaction: TransactionWithSplits) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Transaction actions"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setEditingTransaction(transaction);
            setIsEditDialogOpen(true);
          }}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTransactionToDelete(transaction);
            setDeleteDialogOpen(true);
          }}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!selectedCategoryId) {
    return null;
  }

  if (filteredTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            No transactions found for {selectedCategory?.name || 'this category'} in the selected time period
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl">Transactions</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} for{' '}
            {selectedCategory?.name || 'this category'}
            {startDate || endDate ? ' in selected time period' : ''}
            {editable
              ? '. Click a category or account to change it, or use the actions menu to edit the full transaction.'
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="md:hidden space-y-3">
            {displayedTransactions.map((transaction) => {
              const categorySplit = transaction.splits.find(
                (split) => split.category_id === selectedCategoryId
              );
              const categoryAmount = categorySplit?.amount || 0;
              const isExpense = transaction.transaction_type === 'expense';
              const isEditingCategory = editingField?.transactionId === transaction.id && editingField.field === 'category';
              const isEditingAccount = editingField?.transactionId === transaction.id && editingField.field === 'account';

              return (
                <div key={transaction.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1 truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(transaction.date)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`font-semibold text-sm whitespace-nowrap ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(categoryAmount)}
                      </div>
                      {editable && renderActions(transaction)}
                    </div>
                  </div>

                  {transaction.merchant_name && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Merchant: </span>
                      <span>{transaction.merchant_name}</span>
                    </div>
                  )}

                  <div
                    className={editable ? 'cursor-pointer' : undefined}
                    onClick={
                      editable && !isEditingCategory
                        ? () => startEditing(transaction.id, 'category')
                        : undefined
                    }
                  >
                    {isEditingCategory ? (
                      <CategorySelect
                        value={selectedCategoryId}
                        categories={selectableCategories}
                        onChange={(categoryId) => handleInlineCategoryChange(transaction, categoryId)}
                        onClose={() => setEditingField(null)}
                      />
                    ) : (
                      renderCategoryBadges(transaction)
                    )}
                  </div>

                  {editable && (
                    <div
                      className="text-xs cursor-pointer"
                      onClick={() => !isEditingAccount && startEditing(transaction.id, 'account')}
                    >
                      <span className="text-muted-foreground">Account: </span>
                      {isEditingAccount ? (
                        <AccountSelect
                          transaction={transaction}
                          accounts={accounts}
                          creditCards={creditCards}
                          onChange={(accountId, creditCardId) => {
                            handleInlineAccountChange(transaction, accountId, creditCardId);
                          }}
                          onClose={() => setEditingField(null)}
                        />
                      ) : (
                        renderAccountLabel(transaction)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-32">Merchant</TableHead>
                  <TableHead className="min-w-[150px]">Categories</TableHead>
                  {editable && <TableHead className="w-40">Account</TableHead>}
                  <TableHead className="text-right w-32">Amount</TableHead>
                  {editable && <TableHead className="text-right w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.map((transaction) => {
                  const categorySplit = transaction.splits.find(
                    (split) => split.category_id === selectedCategoryId
                  );
                  const categoryAmount = categorySplit?.amount || 0;
                  const isExpense = transaction.transaction_type === 'expense';
                  const isEditingCategory = editingField?.transactionId === transaction.id && editingField.field === 'category';
                  const isEditingAccount = editingField?.transactionId === transaction.id && editingField.field === 'account';

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[250px] truncate" title={transaction.description}>
                        {transaction.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {transaction.merchant_name ? (
                          <Badge variant="outline" className="text-xs max-w-[120px] truncate" title={transaction.merchant_name}>
                            {transaction.merchant_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={editable ? 'cursor-pointer hover:bg-muted/50' : undefined}
                        onClick={
                          editable && !isEditingCategory
                            ? () => startEditing(transaction.id, 'category')
                            : undefined
                        }
                      >
                        {isEditingCategory ? (
                          <CategorySelect
                            value={selectedCategoryId}
                            categories={selectableCategories}
                            onChange={(categoryId) => handleInlineCategoryChange(transaction, categoryId)}
                            onClose={() => setEditingField(null)}
                          />
                        ) : (
                          renderCategoryBadges(transaction)
                        )}
                      </TableCell>
                      {editable && (
                        <TableCell
                          className="whitespace-nowrap text-xs cursor-pointer hover:bg-muted/50"
                          onClick={() => !isEditingAccount && startEditing(transaction.id, 'account')}
                        >
                          {isEditingAccount ? (
                            <AccountSelect
                              transaction={transaction}
                              accounts={accounts}
                              creditCards={creditCards}
                              onChange={(accountId, creditCardId) => {
                                handleInlineAccountChange(transaction, accountId, creditCardId);
                              }}
                              onClose={() => setEditingField(null)}
                            />
                          ) : (
                            renderAccountLabel(transaction)
                          )}
                        </TableCell>
                      )}
                      <TableCell className={`text-right font-semibold text-sm ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(categoryAmount)}
                      </TableCell>
                      {editable && (
                        <TableCell className="text-right">
                          {renderActions(transaction)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4 md:mt-6">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="sm"
                className="md:size-default"
              >
                {isLoadingMore ? (
                  <>
                    <LoadingSpinner className="mr-2" size="sm" showText={false} />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}

          {!hasMore && displayedTransactions.length > initialCount && (
            <div className="text-center text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
              Showing all {filteredTransactions.length} transactions
            </div>
          )}
        </CardContent>
      </Card>

      {editable && editingTransaction && (
        <EditTransactionDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          categories={categories}
          onSuccess={() => {
            toast.success('Transaction updated');
            onUpdate?.();
          }}
        />
      )}

      {editable && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  {transactionToDelete?.is_historical
                    ? 'This removes the transaction. Historical transactions do not change envelope balances.'
                    : 'This removes the transaction and updates the envelope balance for each category on it.'}
                  {transactionToDelete ? (
                    <div className="mt-2 text-sm font-medium">{transactionToDelete.description}</div>
                  ) : null}
                  <div className="mt-2 font-semibold text-destructive">This cannot be undone.</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTransaction}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete transaction
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
