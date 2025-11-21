import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { formatCurrency } from '@/lib/utils';
import type { PendingCheck } from '@/lib/types';
import { toast } from 'sonner';
import { MoreVertical, Trash2 } from 'lucide-react';

interface PendingCheckListProps {
  pendingChecks: PendingCheck[];
  onUpdate: () => void;
}

export default function PendingCheckList({ pendingChecks, onUpdate }: PendingCheckListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkToDelete, setCheckToDelete] = useState<PendingCheck | null>(null);

  const handleDelete = (check: PendingCheck) => {
    setCheckToDelete(check);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCheck = async () => {
    if (!checkToDelete) return;

    try {
      const response = await fetch(`/api/pending-checks/${checkToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete pending check');
      toast.success('Pending check deleted');
      setDeleteDialogOpen(false);
      setCheckToDelete(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting pending check:', error);
      toast.error('Failed to delete pending check');
    }
  };

  const handleAddCheck = async () => {
    try {
      await fetch('/api/pending-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDescription,
          amount: parseFloat(newAmount),
        }),
      });

      setIsAddDialogOpen(false);
      setNewDescription('');
      setNewAmount('');
      onUpdate();
    } catch (error) {
      console.error('Error adding pending check:', error);
    }
  };

  const totalAmount = pendingChecks.reduce((sum, check) => sum + check.amount, 0);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            Add Pending Check
          </Button>
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
                  <TableCell className="font-medium">{check.description}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(check.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDelete(check)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No pending checks
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pending Check</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCheck}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Pending Check Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pending Check?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{checkToDelete?.description}"</strong>?
              <p className="mt-2 text-sm text-muted-foreground">
                Amount: {checkToDelete && formatCurrency(checkToDelete.amount)}
              </p>
              <p className="mt-2 text-destructive font-semibold">
                This action cannot be undone.
              </p>
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

