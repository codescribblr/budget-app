'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import type { DuplicateGroup, Category, MerchantGroup } from '@/lib/types';

interface MergeTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroup: DuplicateGroup;
  categories: Category[];
  onSuccess: () => void;
}

interface MergeSplit {
  category_id: number;
  amount: number;
  sourceTransactionId: number;
}

function selectBestBaseTransaction(transactions: DuplicateGroup['transactions']) {
  return transactions.reduce((best, current, index) => {
    let score = 0;
    
    // Prefer non-historical
    if (!current.is_historical) score += 10;
    
    // Prefer transactions with merchant groups
    if (current.merchant_group_id) score += 5;
    
    // Prefer longer, more descriptive descriptions
    score += Math.min(current.description.length / 10, 3);
    
    // Prefer more recent
    const daysSince = (Date.now() - new Date(current.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSince);
    
    return score > best.score ? { transaction: current, index, score } : best;
  }, { transaction: transactions[0], index: 0, score: 0 });
}

export default function MergeTransactionDialog({
  isOpen,
  onClose,
  duplicateGroup,
  categories,
  onSuccess,
}: MergeTransactionDialogProps) {
  const transactions = duplicateGroup.transactions;
  
  // Smart defaults: select best base transaction
  const bestBase = useMemo(() => selectBestBaseTransaction(transactions), [transactions]);
  const [baseTransactionIndex, setBaseTransactionIndex] = useState(bestBase.index);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Field selections (indices into transactions array)
  const [selectedDateIndex, setSelectedDateIndex] = useState(bestBase.index);
  const [selectedDescriptionIndex, setSelectedDescriptionIndex] = useState(bestBase.index);
  const [selectedMerchantIndex, setSelectedMerchantIndex] = useState<number | null>(
    transactions.findIndex(t => t.merchant_group_id !== null) >= 0 
      ? transactions.findIndex(t => t.merchant_group_id !== null)
      : null
  );
  const [isHistorical, setIsHistorical] = useState(
    transactions.every(t => t.is_historical)
  );
  
  // Merged splits (combine all splits from all transactions)
  const [mergedSplits, setMergedSplits] = useState<MergeSplit[]>(() => {
    // Start with splits from base transaction
    return transactions[baseTransactionIndex].splits.map(split => ({
      category_id: split.category_id,
      amount: split.amount,
      sourceTransactionId: transactions[baseTransactionIndex].id,
    }));
  });

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      const best = selectBestBaseTransaction(transactions);
      setBaseTransactionIndex(best.index);
      setSelectedDateIndex(best.index);
      setSelectedDescriptionIndex(best.index);
      const merchantIdx = transactions.findIndex(t => t.merchant_group_id !== null);
      setSelectedMerchantIndex(merchantIdx >= 0 ? merchantIdx : null);
      setIsHistorical(transactions.every(t => t.is_historical));
      setMergedSplits(
        transactions[best.index].splits.map(split => ({
          category_id: split.category_id,
          amount: split.amount,
          sourceTransactionId: transactions[best.index].id,
        }))
      );
      setIsCustomizing(false);
    }
  }, [isOpen, transactions]);

  const baseTransaction = transactions[baseTransactionIndex];
  const selectedDate = transactions[selectedDateIndex]?.date || '';
  const selectedDescription = transactions[selectedDescriptionIndex]?.description || '';
  const selectedMerchantId = selectedMerchantIndex !== null 
    ? transactions[selectedMerchantIndex]?.merchant_group_id || null
    : null;
  const selectedMerchantName = selectedMerchantIndex !== null
    ? transactions[selectedMerchantIndex]?.merchant_name || null
    : null;
  const transactionType = baseTransaction.transaction_type;

  const totalSplitAmount = mergedSplits.reduce((sum, split) => sum + split.amount, 0);
  const expectedTotal = baseTransaction.total_amount;
  const amountMatches = Math.abs(totalSplitAmount - expectedTotal) < 0.01;

  const handleAddSplit = () => {
    // Add a split from the first transaction that has splits
    const firstTransaction = transactions.find(t => t.splits.length > 0);
    if (firstTransaction && firstTransaction.splits.length > 0) {
      const firstSplit = firstTransaction.splits[0];
      setMergedSplits([...mergedSplits, {
        category_id: firstSplit.category_id,
        amount: 0,
        sourceTransactionId: firstTransaction.id,
      }]);
    }
  };

  const handleRemoveSplit = (index: number) => {
    if (mergedSplits.length > 1) {
      setMergedSplits(mergedSplits.filter((_, i) => i !== index));
    }
  };

  const handleSplitChange = (index: number, field: 'category_id' | 'amount', value: number) => {
    const newSplits = [...mergedSplits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setMergedSplits(newSplits);
  };

  const handleMerge = async () => {
    if (!amountMatches) {
      toast.error(`Split amounts (${formatCurrency(totalSplitAmount)}) must equal transaction total (${formatCurrency(expectedTotal)})`);
      return;
    }

    if (mergedSplits.length === 0 || mergedSplits.some(s => s.category_id === 0 || s.amount <= 0)) {
      toast.error('Please ensure all splits have valid categories and amounts');
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionsToMerge = transactions
        .map((t, idx) => idx !== baseTransactionIndex ? t.id : null)
        .filter((id): id is number => id !== null);

      const response = await fetch('/api/transactions/merge-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseTransactionId: baseTransaction.id,
          transactionsToMerge,
          mergeData: {
            date: selectedDate,
            description: selectedDescription,
            merchant_group_id: selectedMerchantId,
            is_historical: isHistorical,
            transaction_type: transactionType,
            splits: mergedSplits.map(s => ({
              category_id: s.category_id,
              amount: s.amount,
            })),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to merge transactions');
      }

      toast.success('Transactions merged successfully');
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error merging transactions:', error);
      toast.error(error.message || 'Failed to merge transactions');
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) || dateStr;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Duplicate Transactions ({transactions.length} found)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Why duplicates section */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Same amount: {formatCurrency(duplicateGroup.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Same date: {formatDate(transactions[0].date)}</span>
              </div>
              {transactions.some(t => t.splits.some(s => 
                !transactions[0].splits.some(s2 => s2.category_id === s.category_id)
              )) && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Different categories (will be combined)</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview section */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold mb-2">Preview of Merged Transaction:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                <span className="font-medium">{formatDate(selectedDate)}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  (from Transaction {selectedDateIndex + 1})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Description:</span>{' '}
                <span className="font-medium">{selectedDescription}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  (from Transaction {selectedDescriptionIndex + 1})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="font-medium">{formatCurrency(expectedTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Historical:</span>{' '}
                <span className="font-medium">{isHistorical ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Merchant:</span>{' '}
                <span className="font-medium">{selectedMerchantName || 'None'}</span>
                {selectedMerchantIndex !== null && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (from Transaction {selectedMerchantIndex + 1})
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2">
              <span className="text-muted-foreground text-sm">Categories: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {mergedSplits.map((split, idx) => {
                  const category = categories.find(c => c.id === split.category_id);
                  return (
                    <Badge key={idx} variant="secondary">
                      {category?.name || 'Unknown'}: {formatCurrency(split.amount)}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Split Total:</span>
                <span className={`font-medium ${amountMatches ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(totalSplitAmount)}
                  {amountMatches ? (
                    <CheckCircle2 className="inline-block h-4 w-4 ml-1" />
                  ) : (
                    <XCircle className="inline-block h-4 w-4 ml-1" />
                  )}
                </span>
              </div>
              {!amountMatches && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Must equal {formatCurrency(expectedTotal)}
                </p>
              )}
            </div>
          </div>

          {/* Customize button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="w-full"
          >
            {isCustomizing ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Collapse Customization
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Customize Merge
              </>
            )}
          </Button>

          {/* Customization section */}
          {isCustomizing && (
            <div className="space-y-4 border-t pt-4">
              {/* Transaction comparison */}
              <div>
                <Label className="mb-2 block">Transaction Comparison</Label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2"></th>
                        {transactions.map((_, idx) => (
                          <th key={idx} className="text-left p-2">
                            Transaction {idx + 1}
                            {idx === baseTransactionIndex && (
                              <Badge variant="outline" className="ml-1 text-xs">Base</Badge>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Date</td>
                        {transactions.map((t, idx) => (
                          <td key={idx} className="p-2">{formatDate(t.date)}</td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Description</td>
                        {transactions.map((t, idx) => (
                          <td key={idx} className="p-2 max-w-xs truncate">{t.description}</td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Amount</td>
                        {transactions.map((t, idx) => (
                          <td key={idx} className="p-2">{formatCurrency(t.total_amount)}</td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Categories</td>
                        {transactions.map((t, idx) => (
                          <td key={idx} className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {t.splits.map((s, sIdx) => (
                                <Badge key={sIdx} variant="secondary" className="text-xs">
                                  {s.category_name}: {formatCurrency(s.amount)}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Merchant</td>
                        {transactions.map((t, idx) => (
                          <td key={idx} className="p-2">
                            {t.merchant_name || '—'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Historical</td>
                        {transactions.map((t, idx) => (
                          <td key={idx} className="p-2">
                            {t.is_historical ? 'Yes' : 'No'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Field selection */}
              <div className="space-y-3">
                <div>
                  <Label>Select Date</Label>
                  <Select
                    value={selectedDateIndex.toString()}
                    onValueChange={(value) => setSelectedDateIndex(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactions.map((t, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {formatDate(t.date)} (Transaction {idx + 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Description</Label>
                  <Select
                    value={selectedDescriptionIndex.toString()}
                    onValueChange={(value) => setSelectedDescriptionIndex(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactions.map((t, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {t.description} (Transaction {idx + 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Merchant</Label>
                  <Select
                    value={selectedMerchantIndex?.toString() || 'none'}
                    onValueChange={(value) => setSelectedMerchantIndex(value === 'none' ? null : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No merchant</SelectItem>
                      {transactions.map((t, idx) => {
                        if (t.merchant_group_id) {
                          return (
                            <SelectItem key={idx} value={idx.toString()}>
                              {t.merchant_name || `Transaction ${idx + 1}`} (Transaction {idx + 1})
                            </SelectItem>
                          );
                        }
                        return null;
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="historical"
                    checked={isHistorical}
                    onCheckedChange={(checked) => setIsHistorical(checked as boolean)}
                  />
                  <Label htmlFor="historical" className="cursor-pointer">
                    Mark as historical transaction (won't affect envelope balances)
                  </Label>
                </div>
              </div>

              {/* Category splits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Category Splits</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSplit}>
                    Add Split
                  </Button>
                </div>

                {mergedSplits.map((split, index) => (
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
                          {categories.filter(cat => !cat.is_goal && !cat.is_buffer).map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
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
                        onChange={(e) => handleSplitChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    {mergedSplits.length > 1 && (
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
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={isSubmitting || !amountMatches}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                'Merge Transactions'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


