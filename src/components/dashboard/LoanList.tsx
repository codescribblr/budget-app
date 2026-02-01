import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFeature } from '@/contexts/FeatureContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
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
import type { Loan } from '@/lib/types';
import { toast } from 'sonner';
import { Check, X, MoreVertical, Edit, Trash2, Crown } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';
import Link from 'next/link';
import LoanDialog from '@/components/loans/LoanDialog';

interface LoanListProps {
  loans: Loan[];
  onUpdate: (updatedLoans: Loan[]) => void;
  disabled?: boolean;
}

export default function LoanList({ loans, onUpdate, disabled = false }: LoanListProps) {
  const router = useRouter();
  const loansEnabled = useFeature('loans');
  const { isPremium } = useSubscription();
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // Inline editing state
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState('');

  const handleLoanSuccess = async () => {
    // Refetch loans after successful add/edit
    try {
      const response = await fetch('/api/loans');
      if (response.ok) {
        const updatedLoans = await response.json();
        onUpdate(updatedLoans);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const handleDeleteLoan = (loan: Loan) => {
    setLoanToDelete(loan);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return;

    // Optimistic update
    const updatedLoans = loans.filter(loan => loan.id !== loanToDelete.id);
    onUpdate(updatedLoans);

    try {
      const response = await fetch(`/api/loans/${loanToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete loan');
        throw new Error(errorMessage || 'Failed to delete loan');
      }
      toast.success('Loan deleted');
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
    } catch (error) {
      // Revert on error
      onUpdate(loans);
      console.error('Error deleting loan:', error);
      // Error toast already shown by handleApiError
    }
  };

  const openEditDialog = (loan: Loan) => {
    setEditingLoan(loan);
    setIsLoanDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingLoan(null);
    setIsLoanDialogOpen(true);
  };

  const handleCloseLoanDialog = () => {
    setIsLoanDialogOpen(false);
    setEditingLoan(null);
  };

  // Inline balance editing handlers
  const startEditingBalance = (loan: Loan) => {
    setEditingBalanceId(loan.id);
    setEditingBalanceValue(loan.balance.toString());
  };

  const cancelEditingBalance = () => {
    setEditingBalanceId(null);
    setEditingBalanceValue('');
  };

  const saveInlineBalance = async (loanId: number) => {
    const newBalance = parseFloat(editingBalanceValue) || 0;
    
    // Optimistic update
    const updatedLoans = loans.map(loan => 
      loan.id === loanId ? { ...loan, balance: newBalance } : loan
    );
    onUpdate(updatedLoans);
    setEditingBalanceId(null);
    setEditingBalanceValue('');

    try {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: newBalance,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update balance');
        throw new Error(errorMessage || 'Failed to update balance');
      }

      toast.success('Balance updated');
    } catch (error) {
      // Revert on error
      onUpdate(loans);
      setEditingBalanceId(loanId);
      setEditingBalanceValue(newBalance.toString());
      console.error('Error updating balance:', error);
      // Error toast already shown by handleApiError
    }
  };

  // If feature is disabled, hide widget completely (don't show upgrade prompt for premium users who disabled it)
  if (!loansEnabled) {
    // Only show upgrade prompt if user doesn't have premium
    if (!isPremium) {
      return (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">
            Loans Management is a premium feature
          </p>
          <Button
            onClick={() => router.push('/settings/subscription')}
            size="sm"
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Premium
          </Button>
        </div>
      );
    }
    // Premium user disabled the feature - hide widget completely
    return null;
  }

  const totalBalance = loans.reduce((sum, loan) => sum + loan.balance, 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button onClick={openAddDialog} size="sm" disabled={disabled} className="shrink-0">
          Add Loan
        </Button>
        <div className="text-sm text-muted-foreground shrink-0">
          Total: <span className="font-semibold">{formatCurrency(totalBalance)}</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell>
                <Link href={`/loans/${loan.id}`} className="font-medium hover:underline">
                  {loan.name}
                </Link>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {editingBalanceId === loan.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editingBalanceValue}
                      onChange={(e) => setEditingBalanceValue(e.target.value)}
                      className="w-28 h-8 text-right"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveInlineBalance(loan.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingBalance();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => saveInlineBalance(loan.id)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={cancelEditingBalance}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                    onClick={() => startEditingBalance(loan)}
                  >
                    {formatCurrency(loan.balance)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(loan)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteLoan(loan)} className="text-red-600">
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

      {/* Loan Dialog (used for both add and edit) */}
      <LoanDialog
        isOpen={isLoanDialogOpen}
        onClose={handleCloseLoanDialog}
        loan={editingLoan}
        onSuccess={handleLoanSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{loanToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLoan}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


