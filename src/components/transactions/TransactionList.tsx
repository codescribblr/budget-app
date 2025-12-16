import { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category, Account, CreditCard } from '@/lib/types';
import EditTransactionDialog from './EditTransactionDialog';
import BulkEditDialog, { BulkEditUpdates } from '@/components/import/BulkEditDialog';
import { toast } from 'sonner';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';
import { MoreVertical, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';

interface TransactionListProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  onUpdate: () => void;
  sortBy?: 'date' | 'description' | 'merchant' | 'amount';
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: 'date' | 'description' | 'merchant' | 'amount') => void;
}

interface EditingField {
  transactionId: number;
  field: 'date' | 'category' | 'account';
}

export default function TransactionList({ 
  transactions, 
  categories, 
  onUpdate,
  sortBy = 'date',
  sortDirection = 'desc',
  onSort
}: TransactionListProps) {
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithSplits | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [localTransactions, setLocalTransactions] = useState<TransactionWithSplits[]>(transactions);

  // Sync local transactions with prop changes
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    fetchAccounts();
    fetchCreditCards();
  }, []);

  const fetchAccounts = async () => {
    const response = await fetch('/api/accounts');
    const data = await response.json();
    setAccounts(data);
  };

  const fetchCreditCards = async () => {
    const response = await fetch('/api/credit-cards');
    const data = await response.json();
    setCreditCards(data);
  };

  const handleDelete = (transaction: TransactionWithSplits) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      const response = await fetch(`/api/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete transaction');
        throw new Error(errorMessage || 'Failed to delete transaction');
      }
      toast.success('Transaction deleted');
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      // Error toast already shown by handleApiError
    }
  };

  const handleEdit = (transaction: TransactionWithSplits) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) || dateString;
  };

  // Inline editing handlers
  const handleInlineDateChange = async (transactionId: number, newDate: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to update date');
      }

      // Update local state
      setLocalTransactions(prev => prev.map(t => 
        t.id === transactionId ? { ...t, date: newDate } : t
      ));
      setEditingField(null);
      onUpdate(); // Refresh data
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    }
  };

  const handleInlineCategoryChange = async (transactionId: number, categoryId: number | null) => {
    const transaction = localTransactions.find(t => t.id === transactionId);
    if (!transaction) return;

    try {
      const splits = categoryId 
        ? [{ category_id: categoryId, amount: transaction.total_amount }]
        : [];

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splits }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      // Update local state
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      setLocalTransactions(prev => prev.map(t => {
        if (t.id === transactionId) {
          if (categoryId) {
            const existingSplit = t.splits[0];
            return {
              ...t,
              splits: [{
                id: existingSplit?.id || 0,
                transaction_id: t.id,
                category_id: categoryId,
                amount: transaction.total_amount,
                category_name: category?.name || '',
                created_at: existingSplit?.created_at || new Date().toISOString(),
              }],
            };
          } else {
            return { ...t, splits: [] };
          }
        }
        return t;
      }));
      setEditingField(null);
      onUpdate(); // Refresh data
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleInlineAccountChange = async (transactionId: number, accountId: number | null, creditCardId: number | null) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          account_id: accountId,
          credit_card_id: creditCardId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      // Update local state
      const account = accountId ? accounts.find(a => a.id === accountId) : null;
      const creditCard = creditCardId ? creditCards.find(c => c.id === creditCardId) : null;
      setLocalTransactions(prev => prev.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              account_id: accountId,
              credit_card_id: creditCardId,
              account_name: account?.name || null,
              credit_card_name: creditCard?.name || null,
            } 
          : t
      ));
      setEditingField(null);
      onUpdate(); // Refresh data
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    }
  };

  // Bulk edit handler
  const handleBulkEditSave = async (updates: BulkEditUpdates) => {
    const selectedItems = localTransactions.filter(t => selectedTransactions.has(t.id));

    try {
      const response = await fetch('/api/transactions/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: Array.from(selectedTransactions),
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transactions');
      }

      // Update local state inline without reloading
      setLocalTransactions(prev => prev.map(t => {
        if (!selectedTransactions.has(t.id)) {
          return t;
        }

        const updated = { ...t };

        if (updates.date !== undefined) {
          updated.date = updates.date;
        }

        if (updates.categoryId !== undefined) {
          const category = updates.categoryId ? categories.find(c => c.id === updates.categoryId) : null;
          if (updates.categoryId) {
            // Keep existing split structure but update category
            const existingSplit = t.splits[0];
            updated.splits = [{ 
              id: existingSplit?.id || 0, 
              transaction_id: t.id,
              category_id: updates.categoryId, 
              amount: t.total_amount,
              category_name: category?.name || '',
              created_at: existingSplit?.created_at || new Date().toISOString(),
            }];
          } else {
            updated.splits = [];
          }
        }

        if (updates.accountId !== undefined) {
          updated.account_id = updates.accountId;
          const account = updates.accountId ? accounts.find(a => a.id === updates.accountId) : null;
          updated.account_name = account?.name || null;
        }
        if (updates.creditCardId !== undefined) {
          updated.credit_card_id = updates.creditCardId;
          const creditCard = updates.creditCardId ? creditCards.find(c => c.id === updates.creditCardId) : null;
          updated.credit_card_name = creditCard?.name || null;
        }
        if (updates.accountId === null && updates.creditCardId === null) {
          updated.account_id = null;
          updated.credit_card_id = null;
          updated.account_name = null;
          updated.credit_card_name = null;
        }

        if (updates.isHistorical !== undefined) {
          updated.is_historical = updates.isHistorical;
        }

        return updated;
      }));

      setSelectedTransactions(new Set());
      toast.success(`Updated ${selectedItems.length} transaction${selectedItems.length !== 1 ? 's' : ''}`);
      // Note: Removed onUpdate() call to avoid full page reload - updates are inline
      // Dialog will close via BulkEditDialog's onClose callback
    } catch (error: any) {
      console.error('Error saving bulk edits:', error);
      toast.error(error.message || 'Failed to save bulk edits');
    }
  };

  // DatePicker wrapper component
  function DatePickerWrapper({
    transactionId,
    date,
    onDateChange,
    onClose,
  }: {
    transactionId: number;
    date: string;
    onDateChange: (date: Date | undefined) => void;
    onClose: () => void;
  }) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          const target = event.target as HTMLElement;
          if (target.closest('[role="dialog"]') || target.closest('.rdp')) {
            return;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            onClose();
          }, 100);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [onClose]);

    return (
      <div ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
        <DatePicker
          date={parseLocalDate(date)}
          onDateChange={onDateChange}
        />
      </div>
    );
  }

  if (localTransactions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No transactions yet. Add your first transaction to get started!
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {localTransactions.map((transaction) => (
          <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">{transaction.description}</div>
                <div className="text-xs text-muted-foreground">{formatDate(transaction.date)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`font-semibold text-sm ${transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(transaction.total_amount)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(transaction)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {transaction.merchant_name && (
              <div className="text-xs">
                <span className="text-muted-foreground">Merchant: </span>
                <span>{transaction.merchant_name}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {transaction.splits.map((split) => (
                <Badge key={split.id} variant="secondary" className="text-xs">
                  {split.category_name}: {formatCurrency(split.amount)}
                </Badge>
              ))}
            </div>

            {(transaction.account_name || transaction.credit_card_name) && (
              <div className="text-xs">
                <span className="text-muted-foreground">Account: </span>
                <Badge variant="outline" className="text-xs">
                  {transaction.account_name || transaction.credit_card_name}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={() => setShowBulkEditDialog(true)}
            variant="outline"
            disabled={selectedTransactions.size < 2}
          >
            <Edit className="h-4 w-4 mr-2" />
            Bulk Edit {selectedTransactions.size > 0 ? `(${selectedTransactions.size})` : ''}
          </Button>
          {selectedTransactions.size > 0 && (
            <Button
              onClick={() => setSelectedTransactions(new Set())}
              variant="ghost"
              size="sm"
            >
              Clear Selection
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTransactions.size === localTransactions.length && localTransactions.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTransactions(new Set(localTransactions.map(t => t.id)));
                    } else {
                      setSelectedTransactions(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-20">
                <button
                  onClick={() => onSort?.('date')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Date
                  {sortBy === 'date' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <button
                  onClick={() => onSort?.('description')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Description
                  {sortBy === 'description' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  onClick={() => onSort?.('merchant')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Merchant
                  {sortBy === 'merchant' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead className="min-w-[150px]">Categories</TableHead>
              <TableHead className="w-32">Account</TableHead>
              <TableHead className="text-right w-24">
                <button
                  onClick={() => onSort?.('amount')}
                  className="flex items-center justify-end gap-1 ml-auto hover:text-foreground transition-colors"
                >
                  Amount
                  {sortBy === 'amount' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localTransactions.map((transaction) => {
              const isEditingDate = editingField?.transactionId === transaction.id && editingField?.field === 'date';
              const isEditingCategory = editingField?.transactionId === transaction.id && editingField?.field === 'category';
              const isEditingAccount = editingField?.transactionId === transaction.id && editingField?.field === 'account';
              const isSelected = selectedTransactions.has(transaction.id);

              return (
              <TableRow key={transaction.id}>
                {/* Selection Checkbox */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedTransactions);
                      if (checked) {
                        newSelected.add(transaction.id);
                      } else {
                        newSelected.delete(transaction.id);
                      }
                      setSelectedTransactions(newSelected);
                    }}
                  />
                </TableCell>
                {/* Date Cell - Inline Editable */}
                <TableCell 
                  className="whitespace-nowrap text-xs cursor-pointer hover:bg-muted/50"
                  onClick={() => !isEditingDate && setEditingField({ transactionId: transaction.id, field: 'date' })}
                >
                  {isEditingDate ? (
                    <DatePickerWrapper
                      transactionId={transaction.id}
                      date={transaction.date}
                      onDateChange={(date) => {
                        if (date) {
                          handleInlineDateChange(transaction.id, formatLocalDate(date));
                        }
                        setEditingField(null);
                      }}
                      onClose={() => setEditingField(null)}
                    />
                  ) : (
                    formatDate(transaction.date)
                  )}
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
                {/* Category Cell - Inline Editable */}
                <TableCell 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => !isEditingCategory && setEditingField({ transactionId: transaction.id, field: 'category' })}
                >
                  {isEditingCategory ? (
                    <Select
                      value={transaction.splits[0]?.category_id?.toString() || 'none'}
                      onValueChange={(value) => {
                        const categoryId = value === 'none' ? null : parseInt(value);
                        handleInlineCategoryChange(transaction.id, categoryId);
                      }}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingField(null);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {transaction.splits.length > 0 ? (
                        transaction.splits.map((split) => (
                          <Badge key={split.id} variant="secondary" className="text-xs whitespace-nowrap">
                            {split.category_name}: {formatCurrency(split.amount)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                </TableCell>
                {/* Account Cell - Inline Editable */}
                <TableCell 
                  className="whitespace-nowrap text-xs cursor-pointer hover:bg-muted/50"
                  onClick={() => !isEditingAccount && setEditingField({ transactionId: transaction.id, field: 'account' })}
                >
                  {isEditingAccount ? (
                    <Select
                      value={
                        transaction.account_id 
                          ? `account-${transaction.account_id}` 
                          : transaction.credit_card_id 
                          ? `card-${transaction.credit_card_id}` 
                          : 'none'
                      }
                      onValueChange={(value) => {
                        if (value === 'none') {
                          handleInlineAccountChange(transaction.id, null, null);
                        } else if (value.startsWith('account-')) {
                          handleInlineAccountChange(transaction.id, parseInt(value.replace('account-', '')), null);
                        } else if (value.startsWith('card-')) {
                          handleInlineAccountChange(transaction.id, null, parseInt(value.replace('card-', '')));
                        }
                      }}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingField(null);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={`account-${account.id}`}>
                            {account.name}
                          </SelectItem>
                        ))}
                        {creditCards.map((card) => (
                          <SelectItem key={card.id} value={`card-${card.id}`}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    transaction.account_name ? (
                      <Badge variant="outline" className="text-xs">
                        {transaction.account_name}
                      </Badge>
                    ) : transaction.credit_card_name ? (
                      <Badge variant="outline" className="text-xs">
                        {transaction.credit_card_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  )}
                </TableCell>
                <TableCell className={`text-right font-semibold text-sm whitespace-nowrap ${
                  transaction.transaction_type === 'income' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(transaction.total_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(transaction)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>

      {editingTransaction && (
        <EditTransactionDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          categories={categories}
          onSuccess={onUpdate}
        />
      )}

      {/* Bulk Edit Dialog */}
      {showBulkEditDialog && (
        <BulkEditDialog
          transactions={localTransactions
            .filter(t => selectedTransactions.has(t.id))
            .map(t => ({
              id: `transaction-${t.id}`,
              date: t.date,
              description: t.description,
              amount: t.total_amount,
              transaction_type: t.transaction_type,
              account_id: t.account_id,
              credit_card_id: t.credit_card_id,
              is_historical: t.is_historical,
              splits: t.splits.map(s => ({
                categoryId: s.category_id,
                categoryName: s.category_name,
                amount: s.amount,
              })),
              merchant: t.merchant_name || '',
              status: 'pending' as const,
              isDuplicate: false,
              duplicateType: null,
              originalData: '',
              hash: '',
            }))}
          categories={categories}
          accounts={accounts}
          creditCards={creditCards}
          open={showBulkEditDialog}
          onClose={() => setShowBulkEditDialog(false)}
          onSave={handleBulkEditSave}
        />
      )}

      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete this transaction?
                {transactionToDelete && (
                  <>
                    <div className="mt-2 text-sm font-medium">
                      {transactionToDelete.description}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Date: {parseLocalDate(transactionToDelete.date)?.toLocaleDateString()} • Amount: {formatCurrency(transactionToDelete.total_amount)}
                    </div>
                  </>
                )}
                <div className="mt-2 text-destructive font-semibold">
                  This action cannot be undone.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setTransactionToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

