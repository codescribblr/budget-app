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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';

interface AddToBufferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableToSave: number;
  onSuccess: () => void;
}

export function AddToBufferDialog({
  open,
  onOpenChange,
  availableToSave,
  onSuccess,
}: AddToBufferDialogProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > availableToSave) {
      toast.error('Amount exceeds available funds');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/income-buffer/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to add to buffer');
        throw new Error(errorMessage || 'Failed to add to buffer');
      }

      const data = await response.json();
      toast.success(`Added ${formatCurrency(amountNum)} to Income Buffer`);
      setAmount('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding to buffer:', error);
      // Error toast already shown by handleApiError
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseAll = () => {
    setAmount(availableToSave.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Income Buffer</DialogTitle>
          <DialogDescription>
            Transfer funds to your Income Buffer to smooth irregular income. You can withdraw from the buffer later to fund your categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available to Allocate:</span>
              <span className="font-semibold">{formatCurrency(availableToSave)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buffer-amount">Amount to Add</Label>
            <div className="flex gap-2">
              <Input
                id="buffer-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleUseAll}
                disabled={availableToSave <= 0}
              >
                Use All
              </Button>
            </div>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adding to buffer:</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining available:</span>
                  <span className="font-semibold">
                    {formatCurrency(availableToSave - parseFloat(amount))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !amount || parseFloat(amount) <= 0}>
            {isSubmitting ? 'Adding...' : 'Add to Buffer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


