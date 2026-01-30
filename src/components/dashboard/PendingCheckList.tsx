import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { PendingCheck } from '@/lib/types';
import { toast } from 'sonner';
import { MoreVertical, Trash2, Edit } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';
import Link from 'next/link';
import PendingCheckDialog from '@/components/pending-checks/PendingCheckDialog';

interface PendingCheckListProps {
  pendingChecks: PendingCheck[];
  onUpdate: (updatedPendingChecks: PendingCheck[]) => void;
  onUpdateSummary?: () => void;
  disabled?: boolean;
}

export default function PendingCheckList({ pendingChecks, onUpdate, onUpdateSummary, disabled = false }: PendingCheckListProps) {
  const [editingCheck, setEditingCheck] = useState<PendingCheck | null>(null);
  const [isPendingCheckDialogOpen, setIsPendingCheckDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkToDelete, setCheckToDelete] = useState<PendingCheck | null>(null);

  const handleDelete = (check: PendingCheck) => {
    setCheckToDelete(check);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (check: PendingCheck) => {
    setEditingCheck(check);
    setIsPendingCheckDialogOpen(true);
  };

  const handlePendingCheckSuccess = async () => {
    // Refetch pending checks after successful add/edit
    try {
      const response = await fetch('/api/pending-checks');
      if (response.ok) {
        const updatedPendingChecks = await response.json();
        onUpdate(updatedPendingChecks);
        if (onUpdateSummary) onUpdateSummary();
      }
    } catch (error) {
      console.error('Error fetching pending checks:', error);
    }
  };

  const confirmDeleteCheck = async () => {
    if (!checkToDelete) return;

    // Optimistic update
    const updatedPendingChecks = pendingChecks.filter(check => check.id !== checkToDelete.id);
    onUpdate(updatedPendingChecks);

    try {
      const response = await fetch(`/api/pending-checks/${checkToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete pending check');
        throw new Error(errorMessage || 'Failed to delete pending check');
      }
      toast.success('Pending check deleted');
      if (onUpdateSummary) onUpdateSummary();
      setDeleteDialogOpen(false);
      setCheckToDelete(null);
    } catch (error) {
      // Revert on error
      onUpdate(pendingChecks);
      console.error('Error deleting pending check:', error);
      // Error toast already shown by handleApiError
    }
  };

  const openAddDialog = () => {
    setEditingCheck(null);
    setIsPendingCheckDialogOpen(true);
  };

  const handleClosePendingCheckDialog = () => {
    setIsPendingCheckDialogOpen(false);
    setEditingCheck(null);
  };

  // Calculate total: expenses subtract (negative), income adds (positive)
  const totalAmount = pendingChecks.reduce((sum, check) => {
    const amount = Math.abs(check.amount);
    return sum + (check.type === 'income' ? amount : -amount);
  }, 0);

  // Format amount for display: expenses show as negative, income as positive
  const formatCheckAmount = (check: PendingCheck) => {
    const amount = Math.abs(check.amount);
    return check.type === 'expense' ? -amount : amount;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="mb-3 flex items-center justify-between">
          <Button onClick={openAddDialog} size="sm" disabled={disabled}>
            Add Pending Check
          </Button>
          <div className={`text-sm ${
            totalAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            Total: <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {pendingChecks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingChecks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    <Link href={`/pending-checks/${check.id}`} className="font-medium hover:underline">
                      {check.description}
                    </Link>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${
                    check.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(formatCheckAmount(check))}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={disabled}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(check)} disabled={disabled}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(check)} className="text-red-600" disabled={disabled}>
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
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No pending checks
          </div>
        )}
      </div>

      {/* Pending Check Dialog (used for both add and edit) */}
      <PendingCheckDialog
        isOpen={isPendingCheckDialogOpen}
        onClose={handleClosePendingCheckDialog}
        pendingCheck={editingCheck}
        onSuccess={handlePendingCheckSuccess}
      />

      {/* Delete Pending Check Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pending Check?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete <strong>"{checkToDelete?.description}"</strong>?
                <div className="mt-2 text-sm text-muted-foreground">
                  Type: {checkToDelete?.type === 'income' ? 'Income' : 'Expense'}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Amount: {checkToDelete && formatCurrency(formatCheckAmount(checkToDelete))}
                </div>
                <div className="mt-2 text-destructive font-semibold">
                  This action cannot be undone.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCheckToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCheck}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Check
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

