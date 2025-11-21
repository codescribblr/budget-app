import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface TransactionListProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  onUpdate: () => void;
}

export default function TransactionList({ transactions, categories, onUpdate }: TransactionListProps) {
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
      if (!response.ok) throw new Error('Failed to delete transaction');
      toast.success('Transaction deleted');
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Date</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="w-32">Merchant</TableHead>
              <TableHead className="min-w-[150px]">Categories</TableHead>
              <TableHead className="w-32">Account</TableHead>
              <TableHead className="text-right w-24">Amount</TableHead>
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
                <TableCell className="text-right font-semibold text-sm whitespace-nowrap">
                  {formatCurrency(transaction.total_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(transaction)}
                      className="h-8 px-2 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(transaction)}
                      className="h-8 px-2 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
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
            <AlertDialogDescription>
              Are you sure you want to delete this transaction?
              {transactionToDelete && (
                <>
                  <p className="mt-2 text-sm font-medium">
                    {transactionToDelete.description}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Date: {parseLocalDate(transactionToDelete.date)?.toLocaleDateString()} • Amount: {formatCurrency(transactionToDelete.total_amount)}
                  </p>
                </>
              )}
              <p className="mt-2 text-destructive font-semibold">
                This action cannot be undone.
              </p>
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

