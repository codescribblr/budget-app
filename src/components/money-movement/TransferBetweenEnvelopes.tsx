import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface TransferBetweenEnvelopesProps {
  categories: Category[];
  onSuccess: () => void;
}

export default function TransferBetweenEnvelopes({ categories, onSuccess }: TransferBetweenEnvelopesProps) {
  const [fromCategoryId, setFromCategoryId] = useState<string>('');
  const [toCategoryId, setToCategoryId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromCategory = categories.find(c => c.id.toString() === fromCategoryId);
  const toCategory = categories.find(c => c.id.toString() === toCategoryId);

  const handleTransfer = async () => {
    if (!fromCategoryId || !toCategoryId || !amount) {
      alert('Please fill in all fields');
      return;
    }

    if (fromCategoryId === toCategoryId) {
      alert('Cannot transfer to the same category');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (!fromCategory || fromCategory.current_balance < transferAmount) {
      alert('Insufficient balance in source category');
      return;
    }

    try {
      setIsSubmitting(true);

      // Update both categories
      await Promise.all([
        fetch(`/api/categories/${fromCategoryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_balance: fromCategory.current_balance - transferAmount,
          }),
        }),
        fetch(`/api/categories/${toCategoryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_balance: (toCategory?.current_balance || 0) + transferAmount,
          }),
        }),
      ]);

      // Reset form
      setFromCategoryId('');
      setToCategoryId('');
      setAmount('');
      onSuccess();
      alert('Transfer completed successfully!');
    } catch (error) {
      console.error('Error transferring funds:', error);
      alert('Failed to transfer funds');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="from-category">From Category</Label>
            <Select value={fromCategoryId} onValueChange={setFromCategoryId}>
              <SelectTrigger id="from-category">
                <SelectValue placeholder="Select source category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name} - {formatCurrency(category.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fromCategory && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm text-muted-foreground">Available Balance</div>
              <div className="text-xl font-semibold">
                {formatCurrency(fromCategory.current_balance)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="to-category">To Category</Label>
            <Select value={toCategoryId} onValueChange={setToCategoryId}>
              <SelectTrigger id="to-category">
                <SelectValue placeholder="Select destination category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name} - {formatCurrency(category.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {toCategory && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-xl font-semibold">
                {formatCurrency(toCategory.current_balance)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xs">
        <Label htmlFor="amount">Transfer Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {fromCategory && toCategory && amount && parseFloat(amount) > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="text-sm font-medium mb-2">Transfer Preview:</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{fromCategory.name}:</span>
              <span>
                {formatCurrency(fromCategory.current_balance)} → {' '}
                <span className="font-semibold">
                  {formatCurrency(fromCategory.current_balance - parseFloat(amount))}
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span>{toCategory.name}:</span>
              <span>
                {formatCurrency(toCategory.current_balance)} → {' '}
                <span className="font-semibold">
                  {formatCurrency(toCategory.current_balance + parseFloat(amount))}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleTransfer} disabled={isSubmitting}>
          {isSubmitting ? 'Transferring...' : 'Transfer Funds'}
        </Button>
      </div>
    </div>
  );
}

