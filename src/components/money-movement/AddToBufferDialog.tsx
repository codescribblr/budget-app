'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { Info, AlertTriangle } from 'lucide-react';

// Epsilon for currency comparison - avoid false "over-allocating" when amount equals available (floating-point)
const OVER_ALLOCATION_EPSILON = 0.01;

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
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const performSubmit = async (amountNum: number) => {
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
      setPendingAmount(null);
      onOpenChange(false);
      onSuccess();
      
      // Redirect to dashboard after successful allocation
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error adding to buffer:', error);
      // Error toast already shown by handleApiError
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // If amount exceeds available funds, show confirmation dialog
    if (amountNum > availableToSave + OVER_ALLOCATION_EPSILON) {
      setPendingAmount(amountNum);
      setShowConfirmation(true);
      return;
    }

    // Otherwise, proceed directly
    await performSubmit(amountNum);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    if (pendingAmount !== null) {
      await performSubmit(pendingAmount);
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
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adding to buffer:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining available:</span>
                    <span className={`font-semibold ${
                      parseFloat(amount) > availableToSave + OVER_ALLOCATION_EPSILON ? 'text-destructive' : ''
                    }`}>
                      {formatCurrency(availableToSave - parseFloat(amount))}
                    </span>
                  </div>
                </div>
              </div>
              
              {parseFloat(amount) > availableToSave + OVER_ALLOCATION_EPSILON && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You're allocating more than your available funds. This will result in a negative balance, 
                    meaning you don't have enough in your accounts to cover the funds allocated to your budget categories (envelopes).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !amount || parseFloat(amount) <= 0}>
            {isSubmitting ? 'Adding...' : 'Add to Buffer'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog for Over-Allocation */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Allocate More Than Available?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You're trying to allocate <strong>{pendingAmount !== null ? formatCurrency(pendingAmount) : ''}</strong> to your Income Buffer, 
                  but you only have <strong>{formatCurrency(availableToSave)}</strong> available.
                </p>
                <p>
                  This will result in a negative balance of <strong className="text-destructive">
                    {pendingAmount !== null ? formatCurrency(availableToSave - pendingAmount) : ''}
                  </strong>.
                </p>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Going into the negative means you don't have enough in your accounts to cover the funds 
                    allocated to your budget categories (envelopes). You may need to adjust your allocations 
                    or add more funds to your accounts.
                  </AlertDescription>
                </Alert>
                <p className="font-semibold mt-2">
                  Are you sure you want to continue?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmation(false);
              setPendingAmount(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Yes, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}


