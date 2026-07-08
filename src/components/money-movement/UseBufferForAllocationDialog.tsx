'use client';

import { useEffect, useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Info, Wallet } from 'lucide-react';
import {
  getAllocationOverage,
  getDefaultBufferWithdrawAmount,
  getProjectedAvailableToSave,
  OVER_ALLOCATION_EPSILON,
} from '@/lib/buffer-allocation';

interface UseBufferForAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableToSave: number;
  totalAllocated: number;
  bufferBalance: number;
  onAllocateWithBuffer: (bufferWithdrawAmount: number) => Promise<void>;
  onAllocateWithoutBuffer: () => Promise<void>;
  isSubmitting?: boolean;
}

export function UseBufferForAllocationDialog({
  open,
  onOpenChange,
  availableToSave,
  totalAllocated,
  bufferBalance,
  onAllocateWithBuffer,
  onAllocateWithoutBuffer,
  isSubmitting = false,
}: UseBufferForAllocationDialogProps) {
  const [amount, setAmount] = useState('');

  const overage = getAllocationOverage(availableToSave, totalAllocated);
  const defaultAmount = getDefaultBufferWithdrawAmount(overage, bufferBalance);
  const amountNum = parseFloat(amount) || 0;
  const projectedAvailable = getProjectedAvailableToSave(availableToSave, totalAllocated, amountNum);
  const willBeNegative = projectedAvailable < -OVER_ALLOCATION_EPSILON;

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount.toFixed(2));
    }
  }, [open, defaultAmount]);

  const handleUseBuffer = async () => {
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > bufferBalance + OVER_ALLOCATION_EPSILON) {
      toast.error('Amount exceeds buffer balance');
      return;
    }

    await onAllocateWithBuffer(amountNum);
  };

  const handleAllocateWithoutBuffer = async () => {
    await onAllocateWithoutBuffer();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Use Income Buffer?
          </DialogTitle>
          <DialogDescription>
            This allocation exceeds your available to save. You have funds in your Income Buffer that
            can cover part or all of the shortfall.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available to save:</span>
              <span className="font-semibold">{formatCurrency(availableToSave)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total allocating:</span>
              <span className="font-semibold">{formatCurrency(totalAllocated)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shortfall:</span>
              <span className="font-semibold text-destructive">{formatCurrency(overage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buffer balance:</span>
              <span className="font-semibold">{formatCurrency(bufferBalance)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buffer-withdraw-amount">Withdraw from buffer</Label>
            <div className="flex gap-2">
              <Input
                id="buffer-withdraw-amount"
                type="number"
                step="0.01"
                min="0"
                max={bufferBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(defaultAmount.toFixed(2))}
                disabled={isSubmitting || defaultAmount <= 0}
              >
                Use Default
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Defaults to {formatCurrency(defaultAmount)} — enough to cover the shortfall, or your
              full buffer if it is not enough.
            </p>
          </div>

          {amountNum > 0 && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available to save after:</span>
                <span className={`font-semibold ${willBeNegative ? 'text-destructive' : ''}`}>
                  {formatCurrency(projectedAvailable)}
                </span>
              </div>
            </div>
          )}

          {willBeNegative && amountNum > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Withdrawing {formatCurrency(amountNum)} from your buffer will still leave your
                available to save at{' '}
                <strong className="text-destructive">{formatCurrency(projectedAvailable)}</strong>.
                Your buffer cannot go below zero, so the remainder will stay negative.
              </AlertDescription>
            </Alert>
          )}

          {!willBeNegative && amountNum > 0 && overage > amountNum + OVER_ALLOCATION_EPSILON && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This withdrawal covers part of the shortfall. You can allocate without using the
                buffer to leave available to save negative, or increase the withdrawal up to{' '}
                {formatCurrency(bufferBalance)}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            onClick={handleUseBuffer}
            disabled={isSubmitting || !amount || amountNum <= 0 || amountNum > bufferBalance + OVER_ALLOCATION_EPSILON}
            className="w-full"
          >
            {isSubmitting ? 'Allocating...' : 'Use Buffer & Allocate'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAllocateWithoutBuffer}
            disabled={isSubmitting}
            className="w-full"
          >
            Allocate Without Buffer
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
