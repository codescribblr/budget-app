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
import { handleApiError } from '@/lib/api-error-handler';
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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setAmount('');
      setAllocations([]);
      setEditedAllocations({});
      setTotalAllocated(0);
      setRemainingFunds(0);
    }
  }, [open]);

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
      // Build array of allocations with amounts > 0
      const batchAllocations = allocations
        .filter(allocation => {
          const editedAmount = editedAllocations[allocation.categoryId] || 0;
          return editedAmount > 0;
        })
        .map(allocation => ({
          categoryId: allocation.categoryId,
          amount: editedAllocations[allocation.categoryId],
        }));

      if (batchAllocations.length === 0) {
        toast.error('No allocations to apply');
        return;
      }

      // Execute batch allocation in a single request
      const response = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: batchAllocations,
          month: currentMonth,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to apply allocation');
        throw new Error(errorMessage || 'Failed to apply allocation');
      }

      const result = await response.json();
      toast.success(`Successfully allocated ${formatCurrency(totalAllocated)} across ${result.allocationsProcessed} categories`);
      onSuccess();
      onOpenChange(false);
      setAmount('');
      setAllocations([]);
      setEditedAllocations({});
    } catch (error) {
      console.error('Error applying allocation:', error);
      // Error toast already shown by handleApiError
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
      <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
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
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  // Only allow Enter to submit if preview is not shown yet
                  if (e.key === 'Enter' && allocations.length === 0 && !loading && amount && parseFloat(amount) > 0) {
                    e.preventDefault();
                    calculateAllocation();
                  }
                }}
                placeholder="0.00"
                disabled={applying || loading}
                className="flex-1"
              />
              <Button
                onClick={calculateAllocation}
                disabled={!amount || parseFloat(amount) <= 0 || applying || loading}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available to save: {formatCurrency(availableToSave)}
            </p>
          </div>

          {allocations.length > 0 && (
            <>
              <div className="rounded-lg border p-3 sm:p-4 bg-muted/50">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs sm:text-sm">Total to Allocate</div>
                    <div className="text-base sm:text-lg font-semibold">{formatCurrency(parseFloat(amount))}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs sm:text-sm">Will be Allocated</div>
                    <div className="text-base sm:text-lg font-semibold text-green-600">{formatCurrency(totalAllocated)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs sm:text-sm">Remaining</div>
                    <div className="text-base sm:text-lg font-semibold">{formatCurrency(remainingFunds)}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Allocation Preview</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-y-auto max-h-[50vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-background w-[55%] sm:w-auto md:w-[30%]">Category</TableHead>
                          <TableHead className="sticky top-0 bg-background text-center w-16 hidden sm:table-cell">Priority</TableHead>
                          <TableHead className="sticky top-0 bg-background text-right w-24 hidden md:table-cell">Funded</TableHead>
                          <TableHead className="sticky top-0 bg-background text-right w-24 hidden md:table-cell">Target</TableHead>
                          <TableHead className="sticky top-0 bg-background text-right w-[45%] sm:w-24 md:w-32">Allocate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((allocation) => {
                          const editedAmount = editedAllocations[allocation.categoryId] || 0;
                          // Show all categories, not just those with allocations
                          return (
                            <TableRow key={allocation.categoryId}>
                              <TableCell className="py-3">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-sm break-words">{allocation.categoryName}</span>
                                    {getCategoryTypeBadge(allocation.categoryType)}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground sm:hidden space-y-0.5">
                                    <div>Priority: {allocation.priority}</div>
                                    <div>Funded: {formatCurrency(allocation.fundedThisMonth)} / Target: {formatCurrency(allocation.targetAmount)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center hidden sm:table-cell">
                                <Badge variant="secondary" className="text-xs">{allocation.priority}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm hidden md:table-cell whitespace-nowrap">
                                {formatCurrency(allocation.fundedThisMonth)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm hidden md:table-cell whitespace-nowrap">
                                {formatCurrency(allocation.targetAmount)}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editedAmount || ''}
                                  onChange={(e) => handleAllocationChange(allocation.categoryId, e.target.value)}
                                  placeholder="0.00"
                                  className="w-full sm:w-20 md:w-28 text-right ml-auto text-sm"
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


