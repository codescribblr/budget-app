'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Category } from '@/lib/types';
import TransactionEditDialog from './TransactionEditDialog';

interface TransactionPreviewProps {
  transactions: ParsedTransaction[];
  onImportComplete: () => void;
}

export default function TransactionPreview({ transactions, onImportComplete }: TransactionPreviewProps) {
  const [items, setItems] = useState<ParsedTransaction[]>(transactions);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<ParsedTransaction | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
    setItems(items.map(item => item.id === updated.id ? updated : item));
    setEditingTransaction(null);
  };

  const handleImport = async () => {
    const toImport = items.filter(item => item.status !== 'excluded' && !item.isDuplicate);

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

      alert(`Successfully imported ${toImport.length} transaction(s)`);
      onImportComplete();
    } catch (error) {
      console.error('Error importing transactions:', error);
      alert('Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  const pendingCount = items.filter(item => item.status !== 'excluded' && !item.isDuplicate).length;
  const duplicateCount = items.filter(item => item.isDuplicate).length;
  const excludedCount = items.filter(item => item.status === 'excluded').length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-4 bg-muted rounded-md">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="font-medium">To Import:</span> {pendingCount}
          </div>
          <div>
            <span className="font-medium">Duplicates:</span> {duplicateCount}
          </div>
          <div>
            <span className="font-medium">Excluded:</span> {excludedCount}
          </div>
        </div>
        <Button onClick={handleImport} disabled={isImporting || pendingCount === 0}>
          {isImporting ? 'Importing...' : `Import ${pendingCount} Transaction${pendingCount !== 1 ? 's' : ''}`}
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
            {items.map((transaction) => (
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
                <TableCell>{transaction.date}</TableCell>
                <TableCell className="font-medium">{transaction.merchant}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {transaction.description}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  {transaction.splits.length > 0 ? (
                    <div className="text-sm">
                      {transaction.splits.length === 1 ? (
                        transaction.splits[0].categoryName
                      ) : (
                        <span className="text-muted-foreground">
                          {transaction.splits.length} categories
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell>
                  {transaction.isDuplicate ? (
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(transaction)}
                      disabled={transaction.isDuplicate}
                    >
                      Edit
                    </Button>
                    {!transaction.isDuplicate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleExclude(transaction.id)}
                      >
                        {transaction.status === 'excluded' ? 'Include' : 'Exclude'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
    </div>
  );
}

