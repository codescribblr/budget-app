'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { calculateSmartAllocation, type AllocationPlan } from '@/lib/smart-allocation';
import type { Category } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2, Sparkles, Info } from 'lucide-react';
import { HelpTooltip } from '@/components/ui/help-tooltip';

interface SmartAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  availableToSave: number;
  onSuccess: () => void;
}

export function SmartAllocationDialog({
  open,
  onOpenChange,
  categories,
  availableToSave,
  onSuccess,
}: SmartAllocationDialogProps) {
  const [amount, setAmount] = useState('');
  const [allocations, setAllocations] = useState<AllocationPlan[]>([]);
  const [editedAllocations, setEditedAllocations] = useState<{ [key: number]: number }>({});
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [remainingFunds, setRemainingFunds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  useEffect(() => {
    if (open && amount) {
      calculateAllocation();
    }
  }, [amount, open]);

  const calculateAllocation = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAllocations([]);
      setEditedAllocations({});
      return;
    }

    setLoading(true);
    try {
      // Fetch monthly funding data
      const response = await fetch(`/api/monthly-funding/${currentMonth}`);
      const data = await response.json();

      const fundingMap = new Map<number, { funded: number; target: number }>();
      data.categories?.forEach((cat: any) => {
        fundingMap.set(cat.categoryId, {
          funded: cat.fundedAmount || 0,
          target: cat.targetAmount || 0,
        });
      });

      const result = calculateSmartAllocation(categories, fundingMap, amountNum, currentMonth);
      setAllocations(result.allocations);

      // Initialize edited allocations with calculated values
      const initialEdits: { [key: number]: number } = {};
      result.allocations.forEach(a => {
        initialEdits[a.categoryId] = a.allocatedAmount;
      });
      setEditedAllocations(initialEdits);

      setTotalAllocated(result.totalAllocated);
      setRemainingFunds(result.remainingFunds);
    } catch (error) {
      console.error('Error calculating allocation:', error);
      toast.error('Failed to calculate allocation');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (categoryId: number, value: string) => {
    const numValue = parseFloat(value);
    const newEdited = { ...editedAllocations };

    if (!isNaN(numValue) && numValue >= 0) {
      newEdited[categoryId] = numValue;
    } else if (value === '') {
      newEdited[categoryId] = 0;
    }

    setEditedAllocations(newEdited);

    // Recalculate totals
    const newTotal = Object.values(newEdited).reduce((sum, val) => sum + (val || 0), 0);
    setTotalAllocated(newTotal);

    const amountNum = parseFloat(amount) || 0;
    setRemainingFunds(amountNum - newTotal);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      // Apply each allocation using edited amounts
      for (const allocation of allocations) {
        const editedAmount = editedAllocations[allocation.categoryId] || 0;
        if (editedAmount > 0) {
          await fetch('/api/allocations/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoryId: allocation.categoryId,
              amount: editedAmount,
              month: currentMonth,
            }),
          });
        }
      }

      const allocatedCount = Object.values(editedAllocations).filter(a => a > 0).length;
      toast.success(`Successfully allocated ${formatCurrency(totalAllocated)} across ${allocatedCount} categories`);
      onSuccess();
      onOpenChange(false);
      setAmount('');
      setAllocations([]);
      setEditedAllocations({});
    } catch (error) {
      console.error('Error applying allocation:', error);
      toast.error('Failed to apply allocation');
    } finally {
      setApplying(false);
    }
  };

  const getCategoryTypeBadge = (type: string) => {
    switch (type) {
      case 'monthly_expense':
        return <Badge variant="outline" className="text-xs">Monthly</Badge>;
      case 'accumulation':
        return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Accumulation</Badge>;
      case 'target_balance':
        return <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">Target</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Smart Allocation
          </DialogTitle>
          <DialogDescription>
            Automatically distribute funds across categories based on priorities and needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">Amount to Allocate</label>
              <HelpTooltip content="Enter the amount you want to distribute. The system will allocate funds in priority order." />
            </div>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={applying}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available to save: {formatCurrency(availableToSave)}
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && allocations.length > 0 && (
            <>
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total to Allocate</div>
                    <div className="text-lg font-semibold">{formatCurrency(parseFloat(amount))}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Will be Allocated</div>
                    <div className="text-lg font-semibold text-green-600">{formatCurrency(totalAllocated)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Remaining</div>
                    <div className="text-lg font-semibold">{formatCurrency(remainingFunds)}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Allocation Preview</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Priority</TableHead>
                        <TableHead className="text-right">Funded</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Will Allocate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.map((allocation) => {
                        const editedAmount = editedAllocations[allocation.categoryId] || 0;
                        // Show all categories, not just those with allocations
                        return (
                          <TableRow key={allocation.categoryId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{allocation.categoryName}</span>
                                {getCategoryTypeBadge(allocation.categoryType)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{allocation.priority}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(allocation.fundedThisMonth)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(allocation.targetAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={editedAmount || ''}
                                onChange={(e) => handleAllocationChange(allocation.categoryId, e.target.value)}
                                placeholder="0.00"
                                className="w-28 text-right ml-auto"
                                disabled={applying}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={applying || totalAllocated === 0}>
                  {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Apply Allocation
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

