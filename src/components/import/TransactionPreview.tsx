'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Category } from '@/lib/types';
import TransactionEditDialog from './TransactionEditDialog';
import ImportConfirmationDialog from './ImportConfirmationDialog';
import { generateTransactionHash } from '@/lib/csv-parser';

interface TransactionPreviewProps {
  transactions: ParsedTransaction[];
  onImportComplete: () => void;
}

interface EditingField {
  transactionId: string;
  field: 'date' | 'amount' | 'category';
}

export default function TransactionPreview({ transactions, onImportComplete }: TransactionPreviewProps) {
  const [items, setItems] = useState<ParsedTransaction[]>(transactions);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<ParsedTransaction | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const response = await fetch('/api/categories');
    const data = await response.json();
    setCategories(data);
  };

  const handleToggleExclude = (id: string) => {
    setItems(items.map(item =>
      item.id === id
        ? { ...item, status: item.status === 'excluded' ? 'pending' : 'excluded' }
        : item
    ));
  };

  const handleEdit = (transaction: ParsedTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleSaveEdit = (updated: ParsedTransaction) => {
    setItems(items.map(item => {
      if (item.id === updated.id) {
        // Auto-include when categorized (unless it's a duplicate)
        const hasSplits = updated.splits.length > 0;
        const newStatus = updated.isDuplicate ? 'excluded' : (hasSplits ? 'pending' : 'excluded');
        return { ...updated, status: newStatus };
      }
      return item;
    }));
    setEditingTransaction(null);
  };

  const handleInlineDateChange = (transactionId: string, newDate: string) => {
    setItems(items.map(item => {
      if (item.id === transactionId) {
        // Recalculate hash when date changes (include originalData for uniqueness)
        const newHash = generateTransactionHash(newDate, item.description, item.amount, item.originalData);
        // Auto-include when date changes (unless it's a duplicate)
        const newStatus = item.isDuplicate ? 'excluded' : 'pending';
        return { ...item, date: newDate, hash: newHash, isDuplicate: false, status: newStatus };
      }
      return item;
    }));
    setEditingField(null);
  };

  const handleInlineAmountChange = (transactionId: string, newAmount: string) => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount)) return;

    setItems(items.map(item => {
      if (item.id === transactionId) {
        // Recalculate hash when amount changes (include originalData for uniqueness)
        const newHash = generateTransactionHash(item.date, item.description, amount, item.originalData);

        // Auto-include when amount changes (unless it's a duplicate)
        const newStatus = item.isDuplicate ? 'excluded' : 'pending';

        // Update the amount and adjust the single split if it exists
        const updatedItem = { ...item, amount, hash: newHash, isDuplicate: false, status: newStatus };
        if (updatedItem.splits.length === 1) {
          updatedItem.splits = [{
            ...updatedItem.splits[0],
            amount,
          }];
        }
        return updatedItem;
      }
      return item;
    }));
    setEditingField(null);
  };

  const handleInlineCategoryChange = (transactionId: string, categoryId: string) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    if (!category) return;

    setItems(items.map(item => {
      if (item.id === transactionId) {
        // Replace with a single split for the selected category
        // Auto-include when categorized (unless it's a duplicate)
        const newStatus = item.isDuplicate ? 'excluded' : 'pending';
        return {
          ...item,
          status: newStatus,
          splits: [{
            categoryId: category.id,
            categoryName: category.name,
            amount: item.amount,
          }],
        };
      }
      return item;
    }));
    setEditingField(null);
  };

  const handleImportClick = () => {
    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmImport = async () => {
    setShowConfirmation(false);

    // Only import categorized transactions (have splits)
    const toImport = items.filter(item =>
      item.status !== 'excluded' &&
      !item.isDuplicate &&
      item.splits.length > 0
    );

    if (toImport.length === 0) {
      alert('No transactions to import');
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/import/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: toImport }),
      });

      if (!response.ok) {
        throw new Error('Failed to import transactions');
      }

      const result = await response.json();
      const { imported } = result;

      alert(`Successfully imported ${imported} transaction(s)`);
      onImportComplete();
    } catch (error) {
      console.error('Error importing transactions:', error);
      alert('Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  // Calculate counts for display and confirmation
  const categorizedCount = items.filter(item =>
    item.status !== 'excluded' &&
    !item.isDuplicate &&
    item.splits.length > 0
  ).length;

  const uncategorizedCount = items.filter(item => item.splits.length === 0).length;

  const duplicateCount = items.filter(item => item.isDuplicate).length;

  const manuallyExcludedCount = items.filter(item =>
    item.status === 'excluded' &&
    !item.isDuplicate &&
    item.splits.length > 0
  ).length;

  const totalExcludedCount = items.filter(item => item.status === 'excluded').length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-4 bg-muted rounded-md">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="font-medium">Categorized:</span> {categorizedCount}
          </div>
          <div>
            <span className="font-medium">Uncategorized:</span> {uncategorizedCount}
          </div>
          <div>
            <span className="font-medium">Duplicates:</span> {duplicateCount}
          </div>
          <div>
            <span className="font-medium">Excluded:</span> {totalExcludedCount}
          </div>
        </div>
        <Button onClick={handleImportClick} disabled={isImporting || categorizedCount === 0}>
          {isImporting ? 'Importing...' : `Import ${categorizedCount} Transaction${categorizedCount !== 1 ? 's' : ''}`}
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((transaction) => {
              const isEditingDate = editingField?.transactionId === transaction.id && editingField?.field === 'date';
              const isEditingAmount = editingField?.transactionId === transaction.id && editingField?.field === 'amount';
              const isEditingCategory = editingField?.transactionId === transaction.id && editingField?.field === 'category';

              return (
                <TableRow
                  key={transaction.id}
                  className={
                    transaction.isDuplicate
                      ? 'bg-yellow-50 dark:bg-yellow-950/20'
                      : transaction.status === 'excluded'
                      ? 'bg-gray-50 dark:bg-gray-900 opacity-50'
                      : ''
                  }
                >
                  {/* Date Cell - Inline Editable */}
                  <TableCell
                    onClick={() => setEditingField({ transactionId: transaction.id, field: 'date' })}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {isEditingDate ? (
                      <Input
                        type="date"
                        value={transaction.date}
                        onChange={(e) => handleInlineDateChange(transaction.id, e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        className="h-8"
                      />
                    ) : (
                      transaction.date
                    )}
                  </TableCell>

                  {/* Merchant Cell - Not Editable */}
                  <TableCell className="font-medium">{transaction.merchant}</TableCell>

                  {/* Description Cell - Not Editable */}
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {transaction.description}
                  </TableCell>

                  {/* Amount Cell - Inline Editable */}
                  <TableCell
                    onClick={() => setEditingField({ transactionId: transaction.id, field: 'amount' })}
                    className="text-right font-semibold cursor-pointer hover:bg-muted/50"
                  >
                    {isEditingAmount ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={transaction.amount}
                        onChange={(e) => handleInlineAmountChange(transaction.id, e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        className="h-8 text-right"
                      />
                    ) : (
                      formatCurrency(transaction.amount)
                    )}
                  </TableCell>

                  {/* Category Cell - Inline Editable */}
                  <TableCell
                    onClick={() => transaction.splits.length <= 1 && setEditingField({ transactionId: transaction.id, field: 'category' })}
                    className={transaction.splits.length <= 1 ? 'cursor-pointer hover:bg-muted/50' : ''}
                  >
                    {isEditingCategory ? (
                      <Select
                        value={transaction.splits[0]?.categoryId?.toString() || ''}
                        onValueChange={(value) => handleInlineCategoryChange(transaction.id, value)}
                        onOpenChange={(open) => !open && setEditingField(null)}
                        open={true}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm">
                        {transaction.splits.length > 0 ? (
                          transaction.splits.length === 1 ? (
                            transaction.splits[0].categoryName
                          ) : (
                            <span className="text-muted-foreground">
                              {transaction.splits.length} categories
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Uncategorized</span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell>
                    {transaction.status === 'excluded' && transaction.splits.length === 0 ? (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                        Uncategorized
                      </span>
                    ) : transaction.status === 'excluded' && transaction.isDuplicate ? (
                      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                        Duplicate
                      </span>
                    ) : transaction.status === 'excluded' ? (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded">
                        Excluded
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                        Ready
                      </span>
                    )}
                  </TableCell>

                  {/* Actions Cell */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(transaction)}
                        title="Advanced edit (splits, etc.)"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleExclude(transaction.id)}
                      >
                        {transaction.status === 'excluded' ? 'Include' : 'Exclude'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingTransaction && (
        <TransactionEditDialog
          transaction={editingTransaction}
          categories={categories}
          onSave={handleSaveEdit}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      <ImportConfirmationDialog
        open={showConfirmation}
        onConfirm={handleConfirmImport}
        onCancel={() => setShowConfirmation(false)}
        categorizedCount={categorizedCount}
        uncategorizedCount={uncategorizedCount}
        manuallyExcludedCount={manuallyExcludedCount}
        duplicateCount={duplicateCount}
      />
    </div>
  );
}

