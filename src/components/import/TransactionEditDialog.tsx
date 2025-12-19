'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import type { ParsedTransaction, TransactionSplit } from '@/lib/import-types';
import type { Category, Account, CreditCard } from '@/lib/types';
import { parseLocalDate, formatLocalDate, getTodayLocal } from '@/lib/date-utils';
import TagSelector from '@/components/tags/TagSelector';
import { useFeature } from '@/contexts/FeatureContext';

interface TransactionEditDialogProps {
  transaction: ParsedTransaction;
  categories: Category[];
  onSave: (transaction: ParsedTransaction) => void;
  onClose: () => void;
}

export default function TransactionEditDialog({
  transaction,
  categories,
  onSave,
  onClose,
}: TransactionEditDialogProps) {
  const [date, setDate] = useState<Date>(parseLocalDate(transaction.date) || getTodayLocal());
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [description, setDescription] = useState(transaction.description);
  const [splits, setSplits] = useState<TransactionSplit[]>(
    transaction.splits.length > 0
      ? transaction.splits
      : [{ categoryId: 0, categoryName: '', amount: transaction.amount }]
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(transaction.account_id || null);
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<number | null>(transaction.credit_card_id || null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(transaction.transaction_type || 'expense');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(transaction.tag_ids || []);
  const tagsEnabled = useFeature('tags');

  useEffect(() => {
    fetchAccounts();
    fetchCreditCards();
  }, []);

  const fetchAccounts = async () => {
    const response = await fetch('/api/accounts');
    const data = await response.json();
    setAccounts(data);
  };

  const fetchCreditCards = async () => {
    const response = await fetch('/api/credit-cards');
    const data = await response.json();
    setCreditCards(data);
  };

  const handleAccountChange = (value: string) => {
    if (value === 'none') {
      setSelectedAccountId(null);
      setSelectedCreditCardId(null);
    } else if (value.startsWith('account-')) {
      setSelectedAccountId(parseInt(value.replace('account-', '')));
      setSelectedCreditCardId(null);
    } else if (value.startsWith('card-')) {
      setSelectedCreditCardId(parseInt(value.replace('card-', '')));
      setSelectedAccountId(null);
    }
  };

  const getAccountValue = (): string => {
    if (selectedAccountId) return `account-${selectedAccountId}`;
    if (selectedCreditCardId) return `card-${selectedCreditCardId}`;
    return 'none';
  };

  const handleAddSplit = () => {
    setSplits([...splits, { categoryId: 0, categoryName: '', amount: 0, isAICategorized: false }]);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };

  const handleSplitChange = (index: number, field: 'categoryId' | 'amount', value: any) => {
    const newSplits = [...splits];
    if (field === 'categoryId') {
      const categoryId = parseInt(value);
      const category = categories.find(c => c.id === categoryId);
      newSplits[index] = {
        ...newSplits[index],
        categoryId,
        categoryName: category?.name || '',
        isAICategorized: false, // User manually changed category, clear AI flag
      };
    } else {
      newSplits[index] = {
        ...newSplits[index],
        [field]: parseFloat(value) || 0,
        // Preserve isAICategorized flag when only amount changes
      };
    }
    setSplits(newSplits);
  };

  const getTotalSplits = () => {
    return splits.reduce((sum, split) => sum + split.amount, 0);
  };

  const getRemaining = () => {
    return transaction.amount - getTotalSplits();
  };

  const handleSave = () => {
    const remaining = getRemaining();
    if (Math.abs(remaining) > 0.01) {
      alert(`Split amounts must equal transaction amount. Remaining: ${formatCurrency(remaining)}`);
      return;
    }

    if (splits.some(split => split.categoryId === 0)) {
      alert('Please select a category for all splits');
      return;
    }

    const updated: ParsedTransaction = {
      ...transaction,
      date: formatLocalDate(date),
      merchant,
      description,
      transaction_type: transactionType,
      account_id: selectedAccountId || null,
      credit_card_id: selectedCreditCardId || null,
      tag_ids: selectedTagIds,
      splits,
    };

    onSave(updated);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <DatePicker
                id="date"
                date={date}
                onDateChange={(newDate) => setDate(newDate || new Date())}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="text"
                value={formatCurrency(transaction.amount)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as 'income' | 'expense')}
            >
              <SelectTrigger id="transactionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="account">Account/Card (Optional)</Label>
            <Select value={getAccountValue()} onValueChange={handleAccountChange}>
              <SelectTrigger id="account">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Accounts</div>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={`account-${account.id}`}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {creditCards.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Credit Cards</div>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={`card-${card.id}`}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {tagsEnabled && (
            <div>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                transactionDescription={description}
                categoryIds={splits.map(s => s.categoryId).filter(id => id > 0)}
              />
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <Label>Category Splits</Label>
              <Button variant="outline" size="sm" onClick={handleAddSplit}>
                Add Split
              </Button>
            </div>

            <div className="space-y-3">
              {splits.map((split, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={split.categoryId.toString()}
                      onValueChange={(value) => handleSplitChange(index, 'categoryId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(cat => !cat.is_goal && !cat.is_buffer)
                          // Hide archived by default, but keep currently selected available
                          .filter(cat => !cat.is_archived || cat.id === split.categoryId)
                          .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              {category.name}
                              {category.is_archived && (
                                <span className="text-muted-foreground" title="Archived category">Archived</span>
                              )}
                              {category.is_system && (
                                <span className="text-muted-foreground" title="System category">⚙️</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                    />
                  </div>
                  {splits.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSplit(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="flex justify-between text-sm">
                <span>Total Allocated:</span>
                <span className="font-semibold">{formatCurrency(getTotalSplits())}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Remaining:</span>
                <span className={`font-semibold ${Math.abs(getRemaining()) > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(getRemaining())}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

