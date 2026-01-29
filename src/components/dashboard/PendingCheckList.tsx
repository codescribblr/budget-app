import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { PendingCheck } from '@/lib/types';
import { toast } from 'sonner';
import { MoreVertical, Trash2, Edit } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';

interface PendingCheckListProps {
  pendingChecks: PendingCheck[];
  onUpdate: (updatedPendingChecks: PendingCheck[]) => void;
  onUpdateSummary?: () => void;
  disabled?: boolean;
}

export default function PendingCheckList({ pendingChecks, onUpdate, onUpdateSummary, disabled = false }: PendingCheckListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [editCheck, setEditCheck] = useState<PendingCheck | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkToDelete, setCheckToDelete] = useState<PendingCheck | null>(null);

  const handleDelete = (check: PendingCheck) => {
    setCheckToDelete(check);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (check: PendingCheck) => {
    setEditCheck(check);
    setEditDescription(check.description);
    setEditAmount(Math.abs(check.amount).toString());
    setEditType(check.type);
    setIsEditDialogOpen(true);
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

  const handleAddCheck = async () => {
    if (!newDescription.trim() || !newAmount.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const amount = parseFloat(newAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      const response = await fetch('/api/pending-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDescription,
          amount: amount,
          type: newType,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to add pending check');
        throw new Error(errorMessage || 'Failed to add pending check');
      }

      const newCheck = await response.json();
      const updatedPendingChecks = [...pendingChecks, newCheck];
      onUpdate(updatedPendingChecks);
      if (onUpdateSummary) onUpdateSummary();

      setIsAddDialogOpen(false);
      setNewDescription('');
      setNewAmount('');
      setNewType('expense');
    } catch (error) {
      console.error('Error adding pending check:', error);
      // Error toast already shown by handleApiError
    }
  };

  const handleUpdateCheck = async () => {
    if (!editCheck || !editDescription.trim() || !editAmount.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Save editCheck.id before clearing state
    const checkId = editCheck.id;

    // Optimistic update
    const updatedCheck: PendingCheck = {
      ...editCheck,
      description: editDescription,
      amount: amount,
      type: editType,
    };
    const updatedPendingChecks = pendingChecks.map(check => 
      check.id === editCheck.id ? updatedCheck : check
    );
    onUpdate(updatedPendingChecks);
    setIsEditDialogOpen(false);
    setEditCheck(null);
    setEditDescription('');
    setEditAmount('');
    setEditType('expense');

    try {
      const response = await fetch(`/api/pending-checks/${checkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDescription,
          amount: amount,
          type: editType,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update pending check');
        throw new Error(errorMessage || 'Failed to update pending check');
      }

      if (onUpdateSummary) onUpdateSummary();
    } catch (error) {
      // Revert on error
      onUpdate(pendingChecks);
      setIsEditDialogOpen(true);
      setEditCheck(editCheck);
      setEditDescription(editDescription);
      setEditAmount(editAmount);
      setEditType(editType);
      console.error('Error updating pending check:', error);
      // Error toast already shown by handleApiError
    }
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
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" disabled={disabled}>
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
                <TableHead className="text-right">Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingChecks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell className="font-medium">{check.description}</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${
                      check.type === 'income' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {check.type === 'income' ? 'Income' : 'Expense'}
                    </span>
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

      {/* Add Pending Check Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pending Check</DialogTitle>
            <DialogDescription>
              Add a pending check or deposit that hasn't cleared yet.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newDescription.trim() && newAmount.trim()) {
                  handleAddCheck();
                }
              }
            }}
          >
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., First paycheck"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={newType} onValueChange={(value) => setNewType(value as 'expense' | 'income')}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setNewDescription('');
                setNewAmount('');
                setNewType('expense');
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddCheck}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pending Check Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pending Check</DialogTitle>
            <DialogDescription>
              Update the pending check details.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (editDescription.trim() && editAmount.trim()) {
                  handleUpdateCheck();
                }
              }
            }}
          >
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="e.g., First paycheck"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Select value={editType} onValueChange={(value) => setEditType(value as 'expense' | 'income')}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditCheck(null);
                setEditDescription('');
                setEditAmount('');
                setEditType('expense');
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCheck}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

