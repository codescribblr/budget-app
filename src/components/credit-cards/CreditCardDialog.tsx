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
import type { CreditCard } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';

interface CreditCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  creditCard?: CreditCard | null;
  onSuccess: () => void;
}

export default function CreditCardDialog({ isOpen, onClose, creditCard, onSuccess }: CreditCardDialogProps) {
  const [cardName, setCardName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [availableCredit, setAvailableCredit] = useState('');
  const [includeInTotals, setIncludeInTotals] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (creditCard) {
        // Edit mode
        setCardName(creditCard.name);
        setCreditLimit(creditCard.credit_limit.toString());
        setAvailableCredit(creditCard.available_credit.toString());
        setIncludeInTotals(creditCard.include_in_totals);
      } else {
        // Add mode
        setCardName('');
        setCreditLimit('0');
        setAvailableCredit('0');
        setIncludeInTotals(true);
      }
    }
  }, [isOpen, creditCard]);

  const handleSave = async () => {
    if (!cardName.trim()) {
      toast.error('Please enter a card name');
      return;
    }

    setLoading(true);
    try {
      if (creditCard) {
        // Update existing credit card
        const response = await fetch(`/api/credit-cards/${creditCard.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cardName.trim(),
            credit_limit: parseFloat(creditLimit) || 0,
            available_credit: parseFloat(availableCredit) || 0,
            include_in_totals: includeInTotals,
          }),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to update credit card');
          throw new Error(msg || 'Failed to update credit card');
        }

        toast.success('Credit card updated');
      } else {
        // Create new credit card
        const response = await fetch('/api/credit-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cardName.trim(),
            credit_limit: parseFloat(creditLimit) || 0,
            available_credit: parseFloat(availableCredit) || 0,
            include_in_totals: includeInTotals,
          }),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to add credit card');
          throw new Error(msg || 'Failed to add credit card');
        }

        toast.success('Credit card added');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving credit card:', error);
      toast.error(error.message || 'Failed to save credit card');
    } finally {
      setLoading(false);
    }
  };

  const calculatedBalance = parseFloat(creditLimit || '0') - parseFloat(availableCredit || '0');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{creditCard ? `Edit ${creditCard.name}` : 'Add New Credit Card'}</DialogTitle>
          <DialogDescription>
            {creditCard ? 'Update the credit card details.' : 'Add a new credit card to track your balances.'}
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-4 pt-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (cardName.trim()) {
                handleSave();
              }
            }
          }}
        >
          <div>
            <Label htmlFor="card-name">Card Name</Label>
            <Input
              id="card-name"
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="e.g., Visa Rewards"
            />
          </div>
          <div>
            <Label htmlFor="credit-limit">Credit Limit</Label>
            <Input
              id="credit-limit"
              type="number"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="available-credit">Available Credit</Label>
            <Input
              id="available-credit"
              type="number"
              step="0.01"
              value={availableCredit}
              onChange={(e) => setAvailableCredit(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm text-muted-foreground">Balance Owed (calculated)</div>
            <div className="text-lg font-semibold">{formatCurrency(calculatedBalance)}</div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="include-in-totals"
              checked={includeInTotals}
              onChange={(e) => setIncludeInTotals(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="include-in-totals" className="cursor-pointer">
              Include in totals calculation
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !cardName.trim()}>
              {loading ? 'Saving...' : creditCard ? 'Save' : 'Add Credit Card'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
