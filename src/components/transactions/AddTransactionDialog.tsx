import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import type { Category, Account, CreditCard } from '@/lib/types';
import { format } from 'date-fns';

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: () => void;
}

interface Split {
  category_id: number;
  amount: string;
}

export default function AddTransactionDialog({
  isOpen,
  onClose,
  categories,
  onSuccess,
}: AddTransactionDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [splits, setSplits] = useState<Split[]>([{ category_id: 0, amount: '' }]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      fetchCreditCards();
    }
  }, [isOpen]);

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
    setSplits([...splits, { category_id: 0, amount: '' }]);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length === 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, field: keyof Split, value: string | number) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const calculateTotal = () => {
    return splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    const validSplits = splits.filter(s => s.category_id > 0 && parseFloat(s.amount) > 0);
    if (validSplits.length === 0) {
      alert('Please add at least one category with an amount');
      return;
    }

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          description,
          account_id: selectedAccountId || null,
          credit_card_id: selectedCreditCardId || null,
          splits: validSplits.map(s => ({
            category_id: s.category_id,
            amount: parseFloat(s.amount),
          })),
        }),
      });

      // Reset form
      setDate(new Date());
      setDescription('');
      setSplits([{ category_id: 0, amount: '' }]);
      setSelectedAccountId(null);
      setSelectedCreditCardId(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Grocery shopping at Walmart"
              />
            </div>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Category Splits</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSplit}>
                Add Split
              </Button>
            </div>

            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor={`category-${index}`}>Category</Label>
                  <Select
                    value={split.category_id.toString()}
                    onValueChange={(value) => handleSplitChange(index, 'category_id', parseInt(value))}
                  >
                    <SelectTrigger id={`category-${index}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(cat => !cat.is_goal).map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center gap-2">
                            {category.name}
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
                  <Label htmlFor={`amount-${index}`}>Amount</Label>
                  <Input
                    id={`amount-${index}`}
                    type="number"
                    step="0.01"
                    value={split.amount}
                    onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {splits.length > 1 && (
                  <Button
                    type="button"
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

          <div className="p-4 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Add Transaction</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

