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
import type { Account } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
  onSuccess: () => void;
}

export default function AccountDialog({ isOpen, onClose, account, onSuccess }: AccountDialogProps) {
  const [accountName, setAccountName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'cash'>('checking');
  const [includeInTotals, setIncludeInTotals] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (account) {
        // Edit mode
        setAccountName(account.name);
        setNewBalance(account.balance.toString());
        setAccountType(account.account_type);
        setIncludeInTotals(account.include_in_totals);
      } else {
        // Add mode
        setAccountName('');
        setNewBalance('0');
        setAccountType('checking');
        setIncludeInTotals(true);
      }
    }
  }, [isOpen, account]);

  const handleSave = async () => {
    if (!accountName.trim()) {
      toast.error('Please enter an account name');
      return;
    }

    setLoading(true);
    try {
      if (account) {
        // Update existing account
        const response = await fetch(`/api/accounts/${account.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: accountName.trim(),
            balance: parseFloat(newBalance) || 0,
            account_type: accountType,
            include_in_totals: includeInTotals,
          }),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to update account');
          throw new Error(msg || 'Failed to update account');
        }

        toast.success('Account updated');
      } else {
        // Create new account
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: accountName.trim(),
            balance: parseFloat(newBalance) || 0,
            account_type: accountType,
            include_in_totals: includeInTotals,
          }),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to add account');
          throw new Error(msg || 'Failed to add account');
        }

        toast.success('Account added');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? `Edit ${account.name}` : 'Add New Account'}</DialogTitle>
          <DialogDescription>
            {account ? 'Update the account details.' : 'Add a new cash account to track your finances.'}
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-4 pt-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (accountName.trim()) {
                handleSave();
              }
            }
          }}
        >
          <div>
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Checking Account"
            />
          </div>
          <div>
            <Label htmlFor="balance">{account ? 'Balance' : 'Starting Balance'}</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="account-type">Account Type</Label>
            <Select value={accountType} onValueChange={(value: 'checking' | 'savings' | 'cash') => setAccountType(value)}>
              <SelectTrigger id="account-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
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
            <Button onClick={handleSave} disabled={loading || !accountName.trim()}>
              {loading ? 'Saving...' : account ? 'Save' : 'Add Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
