import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface AllocateIncomeProps {
  categories: Category[];
  currentSavings: number;
  onSuccess: () => void;
}

export default function AllocateIncome({ categories, currentSavings, onSuccess }: AllocateIncomeProps) {
  const [allocations, setAllocations] = useState<{ [key: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalMonthlyBudget = categories.reduce((sum, cat) => sum + cat.monthly_amount, 0);
  const availableToAllocate = currentSavings;

  const handleUseMonthlyAmounts = () => {
    const newAllocations: { [key: number]: number } = {};
    categories.forEach(cat => {
      newAllocations[cat.id] = cat.monthly_amount;
    });
    setAllocations(newAllocations);
  };

  const handleUseProportional = () => {
    if (availableToAllocate <= 0) {
      alert('No funds available to allocate. Please update your account balances.');
      return;
    }

    const newAllocations: { [key: number]: number } = {};

    categories.forEach(cat => {
      const proportion = cat.monthly_amount / totalMonthlyBudget;
      newAllocations[cat.id] = parseFloat((availableToAllocate * proportion).toFixed(2));
    });

    setAllocations(newAllocations);
  };

  const handleAllocateAll = () => {
    if (availableToAllocate <= 0) {
      alert('No funds available to allocate. Please update your account balances.');
      return;
    }

    const newAllocations: { [key: number]: number } = {};
    const perCategory = parseFloat((availableToAllocate / categories.length).toFixed(2));

    categories.forEach(cat => {
      newAllocations[cat.id] = perCategory;
    });

    setAllocations(newAllocations);
  };

  const handleClearAllocations = () => {
    setAllocations({});
  };

  const handleAllocationChange = (categoryId: number, value: string) => {
    const newAllocations = { ...allocations };
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      newAllocations[categoryId] = numValue;
    } else if (value === '') {
      newAllocations[categoryId] = 0;
    }
    setAllocations(newAllocations);
  };

  const getTotalAllocated = () => {
    return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  };

  const getRemaining = () => {
    return availableToAllocate - getTotalAllocated();
  };

  const handleAllocate = async () => {
    const totalAllocated = getTotalAllocated();

    if (totalAllocated === 0) {
      alert('Please allocate funds to at least one category');
      return;
    }

    try {
      setIsSubmitting(true);

      // Update all categories with allocations
      const updates = categories
        .filter(cat => allocations[cat.id] > 0)
        .map(cat =>
          fetch(`/api/categories/${cat.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_balance: cat.current_balance + allocations[cat.id],
            }),
          })
        );

      await Promise.all(updates);

      // Reset form
      setAllocations({});
      onSuccess();
      alert(`Successfully allocated ${formatCurrency(totalAllocated)} to envelopes!`);
    } catch (error) {
      console.error('Error allocating funds:', error);
      alert('Failed to allocate funds');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Available to Allocate (Current Savings)</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(availableToAllocate)}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            This is your current savings balance from the dashboard.<br />
            Update your account balances to change this amount.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleUseMonthlyAmounts}>
          Use Monthly Amounts
        </Button>
        <Button variant="outline" onClick={handleUseProportional}>
          Distribute Proportionally
        </Button>
        <Button variant="outline" onClick={handleAllocateAll}>
          Split Evenly
        </Button>
        <Button variant="outline" onClick={handleClearAllocations}>
          Clear All
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Monthly Amount</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead className="text-right">Allocate</TableHead>
              <TableHead className="text-right">New Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const allocation = allocations[category.id] || 0;
              const newBalance = category.current_balance + allocation;
              
              return (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(category.monthly_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(category.current_balance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={allocation || ''}
                      onChange={(e) => handleAllocationChange(category.id, e.target.value)}
                      placeholder="0.00"
                      className="w-28 text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(newBalance)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted rounded-md">
          <div className="text-sm text-muted-foreground">Available Funds</div>
          <div className="text-xl font-semibold">
            {formatCurrency(availableToAllocate)}
          </div>
        </div>
        <div className="p-4 bg-muted rounded-md">
          <div className="text-sm text-muted-foreground">Total Allocated</div>
          <div className="text-xl font-semibold">
            {formatCurrency(getTotalAllocated())}
          </div>
        </div>
        <div className={`p-4 rounded-md ${getRemaining() < 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}`}>
          <div className="text-sm text-muted-foreground">Remaining</div>
          <div className={`text-xl font-semibold ${getRemaining() < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCurrency(getRemaining())}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleAllocate} disabled={isSubmitting}>
          {isSubmitting ? 'Allocating...' : 'Allocate to Envelopes'}
        </Button>
      </div>
    </div>
  );
}

