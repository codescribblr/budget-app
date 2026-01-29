'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PendingCheck } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';

interface PendingCheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCheck?: PendingCheck | null;
  onSuccess: () => void;
}

export default function PendingCheckDialog({ isOpen, onClose, pendingCheck, onSuccess }: PendingCheckDialogProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (pendingCheck) {
        // Edit mode
        setDescription(pendingCheck.description);
        setAmount(Math.abs(pendingCheck.amount).toString());
        setType(pendingCheck.type);
      } else {
        // Add mode
        setDescription('');
        setAmount('');
        setType('expense');
      }
    }
  }, [isOpen, pendingCheck]);

  const handleSave = async () => {
    if (!description.trim() || !amount.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        amount: amountValue,
        type: type,
      };

      if (pendingCheck) {
        // Update existing pending check
        const response = await fetch(`/api/pending-checks/${pendingCheck.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to update pending check');
          throw new Error(msg || 'Failed to update pending check');
        }

        toast.success('Pending check updated');
      } else {
        // Create new pending check
        const response = await fetch('/api/pending-checks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to add pending check');
          throw new Error(msg || 'Failed to add pending check');
        }

        toast.success('Pending check added');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving pending check:', error);
      toast.error(error.message || 'Failed to save pending check');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pendingCheck ? `Edit ${pendingCheck.description}` : 'Add Pending Check'}</DialogTitle>
          <DialogDescription>
            {pendingCheck ? 'Update the pending check details.' : 'Add a pending check or deposit that hasn\'t cleared yet.'}
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-4 pt-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (description.trim() && amount.trim()) {
                handleSave();
              }
            }
          }}
        >
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., First paycheck"
            />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'expense' | 'income')}>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !description.trim() || !amount.trim()}>
              {loading ? 'Saving...' : pendingCheck ? 'Save' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
