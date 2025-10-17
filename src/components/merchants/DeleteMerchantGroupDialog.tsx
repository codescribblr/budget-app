'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { MerchantGroupWithStats } from '@/lib/types';

interface DeleteMerchantGroupDialogProps {
  group: MerchantGroupWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function DeleteMerchantGroupDialog({
  group,
  open,
  onOpenChange,
  onSuccess,
}: DeleteMerchantGroupDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/merchant-groups/${group.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Merchant group deleted successfully');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Failed to delete merchant group');
      }
    } catch (error) {
      console.error('Error deleting merchant group:', error);
      toast.error('Failed to delete merchant group');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Merchant Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this merchant group?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-semibold text-lg mb-2">{group.display_name}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Transaction Patterns</div>
                <div className="font-semibold">{group.unique_patterns}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Transactions</div>
                <div className="font-semibold">{group.transaction_count}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Amount</div>
                <div className="font-semibold">{formatCurrency(group.total_amount)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Average</div>
                <div className="font-semibold">
                  {group.transaction_count > 0
                    ? formatCurrency(group.total_amount / group.transaction_count)
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action cannot be undone. All transaction patterns will be removed from this group and become ungrouped. The transactions themselves will not be deleted.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

