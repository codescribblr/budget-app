'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Category, Account, CreditCard } from '@/lib/types';
import { parseLocalDate, formatLocalDate, getTodayLocal } from '@/lib/date-utils';

interface BulkEditDialogProps {
  transactions: ParsedTransaction[];
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCard[];
  open: boolean;
  onClose: () => void;
  onSave: (updates: BulkEditUpdates) => Promise<void>;
}

export interface BulkEditUpdates {
  date?: string;
  categoryId?: number | null;
  accountId?: number | null;
  creditCardId?: number | null;
  isHistorical?: boolean;
}

export default function BulkEditDialog({
  transactions,
  categories,
  accounts,
  creditCards,
  open,
  onClose,
  onSave,
}: BulkEditDialogProps) {
  // Calculate initial values - show "Various" if different
  const getInitialDate = (): Date | null => {
    const dates = transactions.map(t => t.date);
    const allSame = dates.every(d => d === dates[0]);
    if (allSame && dates[0]) {
      return parseLocalDate(dates[0]) || getTodayLocal();
    }
    return null;
  };

  const getInitialCategory = (): number | null | 'various' => {
    const categoryIds = transactions.map(t => t.splits[0]?.categoryId).filter(id => id !== undefined);
    if (categoryIds.length === 0) return null;
    const allSame = categoryIds.every(id => id === categoryIds[0]);
    if (allSame) return categoryIds[0] || null;
    return 'various';
  };

  const getInitialAccount = (): string | 'various' => {
    if (transactions.length === 0) return 'none';
    const accountValues = transactions.map(t => {
      if (t.account_id !== undefined && t.account_id !== null) return `account-${t.account_id}`;
      if (t.credit_card_id !== undefined && t.credit_card_id !== null) return `card-${t.credit_card_id}`;
      return 'none';
    });
    const allSame = accountValues.every(v => v === accountValues[0]);
    if (allSame && accountValues[0]) return accountValues[0];
    return 'various';
  };

  const getInitialHistorical = (): boolean | 'various' => {
    const historicalValues = transactions.map(t => t.is_historical ?? false);
    const allSame = historicalValues.every(v => v === historicalValues[0]);
    if (allSame) return historicalValues[0];
    return 'various';
  };

  const [date, setDate] = useState<Date | null>(getInitialDate());
  const [categoryId, setCategoryId] = useState<number | null | 'various'>(getInitialCategory());
  const [accountValue, setAccountValue] = useState<string | 'various'>(getInitialAccount());
  const [isHistorical, setIsHistorical] = useState<boolean | 'various'>(getInitialHistorical());
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens/closes or transactions change
  useEffect(() => {
    if (open) {
      setDate(getInitialDate());
      setCategoryId(getInitialCategory());
      setAccountValue(getInitialAccount());
      setIsHistorical(getInitialHistorical());
    }
  }, [open, transactions]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: BulkEditUpdates = {};

      // Only include fields that were changed
      const initialDate = getInitialDate();
      // Only update date if it was changed from initial value
      if (date) {
        const dateStr = formatLocalDate(date);
        const initialDateStr = initialDate ? formatLocalDate(initialDate) : null;
        if (dateStr !== initialDateStr) {
          updates.date = dateStr;
        }
      }
      // If date is null and initial was not null, don't update (user cleared it but we don't support clearing)

      const initialCategory = getInitialCategory();
      if (categoryId !== 'various' && categoryId !== initialCategory) {
        updates.categoryId = categoryId;
      }

      const initialAccount = getInitialAccount();
      // Only update if value changed and is not "various"
      if (accountValue && accountValue !== 'various' && accountValue !== initialAccount) {
        if (accountValue === 'none') {
          updates.accountId = null;
          updates.creditCardId = null;
        } else if (accountValue.startsWith('account-')) {
          updates.accountId = parseInt(accountValue.replace('account-', ''));
          updates.creditCardId = null;
        } else if (accountValue.startsWith('card-')) {
          updates.creditCardId = parseInt(accountValue.replace('card-', ''));
          updates.accountId = null;
        }
      } else if (accountValue === 'various') {
        // If still "various", don't update account
        // (user needs to select a specific value)
      }

      const initialHistorical = getInitialHistorical();
      if (isHistorical !== 'various' && isHistorical !== initialHistorical) {
        updates.isHistorical = isHistorical;
      }

      // Only save if there are actual changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }

      onClose();
    } catch (error) {
      console.error('Error saving bulk edits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit {transactions.length} Transaction{transactions.length !== 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="bulk-date">Date</Label>
            <DatePicker
              date={date || undefined}
              onDateChange={(newDate) => setDate(newDate || null)}
            />
            {date === null && (
              <p className="text-sm text-muted-foreground">Various dates selected</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="bulk-category">Category</Label>
            <Select
              value={categoryId === 'various' ? 'various' : categoryId?.toString() || 'none'}
              onValueChange={(value) => {
                if (value === 'various' || value === 'none') {
                  setCategoryId(value === 'none' ? null : 'various');
                } else {
                  setCategoryId(parseInt(value));
                }
              }}
            >
              <SelectTrigger id="bulk-category">
                <SelectValue placeholder="Select category">
                  {categoryId === 'various' ? 'Various' : categoryId ? categories.find(c => c.id === categoryId)?.name || 'None' : 'None'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryId === 'various' && (
              <p className="text-sm text-muted-foreground">Various categories selected</p>
            )}
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label htmlFor="bulk-account">Account</Label>
            <Select
              value={accountValue === 'various' ? 'none' : (accountValue || 'none')}
              onValueChange={(value) => {
                // If current value is "various", allow selecting a new value
                setAccountValue(value);
              }}
            >
              <SelectTrigger id="bulk-account">
                <SelectValue placeholder="Select account">
                  {accountValue === 'various' ? 'Various' : accountValue === 'none' || !accountValue ? 'None' : 
                   accountValue && accountValue.startsWith('account-') 
                     ? accounts.find(a => a.id === parseInt(accountValue.replace('account-', '')))?.name || 'Unknown'
                     : accountValue && accountValue.startsWith('card-')
                     ? creditCards.find(c => c.id === parseInt(accountValue.replace('card-', '')))?.name || 'Unknown'
                     : 'None'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={`account-${account.id}`}>
                    {account.name}
                  </SelectItem>
                ))}
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={`card-${card.id}`}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accountValue === 'various' && (
              <p className="text-sm text-muted-foreground">Various accounts selected</p>
            )}
          </div>

          {/* Historical */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bulk-historical"
              checked={isHistorical === true}
              onCheckedChange={(checked) => {
                setIsHistorical(checked === true);
              }}
              disabled={isHistorical === 'various'}
            />
            <Label htmlFor="bulk-historical" className="cursor-pointer">
              Historical (won't affect current budget)
            </Label>
            {isHistorical === 'various' && (
              <span className="text-sm text-muted-foreground ml-2">(Various)</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
