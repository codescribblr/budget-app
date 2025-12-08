import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import EditTransactionDialog from './EditTransactionDialog';
import { toast } from 'sonner';
import { parseLocalDate } from '@/lib/date-utils';
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

  if (transactions.length === 0) {
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
        {transactions.map((transaction) => (
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
        <Table>
          <TableHeader>
            <TableRow>
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
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap text-xs">
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
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {transaction.splits.map((split) => (
                      <Badge key={split.id} variant="secondary" className="text-xs whitespace-nowrap">
                        {split.category_name}: {formatCurrency(split.amount)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {transaction.account_name ? (
                    <Badge variant="outline" className="text-xs">
                      {transaction.account_name}
                    </Badge>
                  ) : transaction.credit_card_name ? (
                    <Badge variant="outline" className="text-xs">
                      {transaction.credit_card_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
            ))}
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

