'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Category, Account, CreditCard } from '@/lib/types';
import TransactionEditDialog from './TransactionEditDialog';
import ImportConfirmationDialog from './ImportConfirmationDialog';
import ImportProgressDialog from './ImportProgressDialog';
import { generateTransactionHash } from '@/lib/csv-parser';

interface TransactionPreviewProps {
  transactions: ParsedTransaction[];
  onImportComplete: () => void;
}

interface EditingField {
  transactionId: string;
  field: 'date' | 'amount' | 'category' | 'account';
}

export default function TransactionPreview({ transactions, onImportComplete }: TransactionPreviewProps) {
  const [items, setItems] = useState<ParsedTransaction[]>(transactions);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);
  const [defaultCreditCardId, setDefaultCreditCardId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<ParsedTransaction | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [progressMessage, setProgressMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchCreditCards();
  }, []);

  // Update transactions when default account/card changes
  useEffect(() => {
    setItems(prevItems => prevItems.map(item => ({
      ...item,
      // Only set default if transaction doesn't already have an account/card set
      account_id: item.account_id !== undefined ? item.account_id : (defaultAccountId || null),
      credit_card_id: item.credit_card_id !== undefined ? item.credit_card_id : (defaultCreditCardId || null),
    })));
  }, [defaultAccountId, defaultCreditCardId]);

  const fetchCategories = async () => {
    const response = await fetch('/api/categories?excludeGoals=true');
    const data = await response.json();
    setCategories(data);
  };

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

  const handleDefaultAccountChange = (value: string) => {
    if (value === 'none') {
      setDefaultAccountId(null);
      setDefaultCreditCardId(null);
    } else if (value.startsWith('account-')) {
      setDefaultAccountId(parseInt(value.replace('account-', '')));
      setDefaultCreditCardId(null);
    } else if (value.startsWith('card-')) {
      setDefaultCreditCardId(parseInt(value.replace('card-', '')));
      setDefaultAccountId(null);
    }
  };

  const getDefaultAccountValue = (): string => {
    if (defaultAccountId) return `account-${defaultAccountId}`;
    if (defaultCreditCardId) return `card-${defaultCreditCardId}`;
    return 'none';
  };

  const handleInlineAccountChange = (transactionId: string, value: string) => {
    setItems(items.map(item => {
      if (item.id === transactionId) {
        if (value === 'none') {
          return { ...item, account_id: null, credit_card_id: null };
        } else if (value.startsWith('account-')) {
          return { ...item, account_id: parseInt(value.replace('account-', '')), credit_card_id: null };
        } else if (value.startsWith('card-')) {
          return { ...item, account_id: null, credit_card_id: parseInt(value.replace('card-', '')) };
        }
      }
      return item;
    }));
    setEditingField(null);
  };

  const getAccountDisplayName = (transaction: ParsedTransaction): string => {
    if (transaction.account_id) {
      const account = accounts.find(a => a.id === transaction.account_id);
      return account ? account.name : '—';
    }
    if (transaction.credit_card_id) {
      const card = creditCards.find(c => c.id === transaction.credit_card_id);
      return card ? card.name : '—';
    }
    return '—';
  };

  const handleToggleExclude = (id: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newStatus = item.status === 'excluded' ? 'pending' : 'excluded';

        // If user is including a duplicate, mark it for forced import
        if (newStatus === 'pending' && item.isDuplicate) {
          // Modify description to make hash unique
          const uniqueSuffix = ` [${Date.now()}]`;
          const newDescription = item.description + uniqueSuffix;
          const newHash = generateTransactionHash(item.date, newDescription, item.amount, item.originalData);

          return {
            ...item,
            description: newDescription,
            hash: newHash,
            status: newStatus,
            forceImport: true,
            isDuplicate: false, // No longer a duplicate after modification
            duplicateType: null,
          };
        }

        return { ...item, status: newStatus };
      }
      return item;
    }));
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
        const newStatus: 'pending' | 'confirmed' | 'excluded' = item.isDuplicate ? 'excluded' : 'pending';

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
      setProgressStatus('error');
      setProgressMessage('No transactions to import');
      setShowProgress(true);
      return;
    }

    // Show progress dialog
    setIsImporting(true);
    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage(`Importing ${toImport.length} transaction${toImport.length !== 1 ? 's' : ''}...`);

    try {
      const response = await fetch('/api/import/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: toImport,
          isHistorical: isHistorical,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import transactions');
      }

      const result = await response.json();
      const { imported } = result;

      // Show success
      setProgressStatus('success');
      setProgressMessage('All transactions have been processed successfully.');
      setImportedCount(imported);
    } catch (error) {
      console.error('Error importing transactions:', error);
      setProgressStatus('error');
      setProgressMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  const handleProgressContinue = () => {
    setShowProgress(false);
    if (progressStatus === 'success') {
      onImportComplete();
    }
  };

  // Calculate counts for display and confirmation
  const categorizedCount = items.filter(item =>
    item.status !== 'excluded' &&
    !item.isDuplicate &&
    item.splits.length > 0
  ).length;

  const uncategorizedCount = items.filter(item => item.splits.length === 0).length;

  const databaseDuplicateCount = items.filter(item => item.duplicateType === 'database').length;
  const withinFileDuplicateCount = items.filter(item => item.duplicateType === 'within-file').length;
  const duplicateCount = databaseDuplicateCount + withinFileDuplicateCount;

  const manuallyExcludedCount = items.filter(item =>
    item.status === 'excluded' &&
    !item.isDuplicate &&
    item.splits.length > 0
  ).length;

  const totalExcludedCount = items.filter(item => item.status === 'excluded').length;

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="p-4 bg-muted rounded-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="font-medium">Categorized:</span> {categorizedCount}
            </div>
            <div>
              <span className="font-medium">Uncategorized:</span> {uncategorizedCount}
            </div>
            {databaseDuplicateCount > 0 && (
              <div>
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Duplicates:</span> {databaseDuplicateCount}
              </div>
            )}
            {withinFileDuplicateCount > 0 && (
              <div>
                <span className="font-medium text-orange-700 dark:text-orange-400">Potential Duplicates:</span> {withinFileDuplicateCount}
              </div>
            )}
            <div>
              <span className="font-medium">Excluded:</span> {totalExcludedCount}
            </div>
          </div>
          <Button onClick={handleImportClick} disabled={isImporting || categorizedCount === 0} className="shrink-0">
            {isImporting ? 'Importing...' : `Import ${categorizedCount} Transaction${categorizedCount !== 1 ? 's' : ''}`}
          </Button>
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id="historical"
            checked={isHistorical}
            onCheckedChange={(checked) => setIsHistorical(checked as boolean)}
          />
          <Label
            htmlFor="historical"
            className="text-sm font-normal cursor-pointer"
          >
            Import as historical (won&apos;t affect current envelope balances)
          </Label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 pt-2 border-t">
          <Label htmlFor="default-account" className="text-sm font-medium sm:min-w-[120px]">
            Default Account/Card:
          </Label>
          <Select value={getDefaultAccountValue()} onValueChange={handleDefaultAccountChange}>
            <SelectTrigger id="default-account" className="w-full sm:w-[250px]">
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
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="whitespace-nowrap">Merchant</TableHead>
              <TableHead className="whitespace-nowrap">Description</TableHead>
              <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
              <TableHead className="whitespace-nowrap">Category</TableHead>
              <TableHead className="whitespace-nowrap">Account</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((transaction) => {
              const isEditingDate = editingField?.transactionId === transaction.id && editingField?.field === 'date';
              const isEditingAmount = editingField?.transactionId === transaction.id && editingField?.field === 'amount';
              const isEditingCategory = editingField?.transactionId === transaction.id && editingField?.field === 'category';
              const isEditingAccount = editingField?.transactionId === transaction.id && editingField?.field === 'account';

              return (
                <TableRow
                  key={transaction.id}
                  className={
                    transaction.duplicateType === 'database'
                      ? 'bg-yellow-50 dark:bg-yellow-950/20'
                      : transaction.duplicateType === 'within-file'
                      ? 'bg-orange-50 dark:bg-orange-950/20'
                      : transaction.status === 'excluded'
                      ? 'bg-gray-50 dark:bg-gray-900 opacity-50'
                      : ''
                  }
                >
                  {/* Date Cell - Inline Editable */}
                  <TableCell
                    onClick={() => setEditingField({ transactionId: transaction.id, field: 'date' })}
                    className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
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
                  <TableCell className="font-medium min-w-[150px] max-w-[200px] truncate">{transaction.merchant}</TableCell>

                  {/* Description Cell - Not Editable */}
                  <TableCell className="text-sm text-muted-foreground min-w-[150px] max-w-[250px] truncate">
                    {transaction.description}
                  </TableCell>

                  {/* Amount Cell - Inline Editable */}
                  <TableCell
                    onClick={() => setEditingField({ transactionId: transaction.id, field: 'amount' })}
                    className="text-right font-semibold cursor-pointer hover:bg-muted/50 min-w-[100px]"
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
                    className={`min-w-[150px] max-w-[200px] ${transaction.splits.length <= 1 ? 'cursor-pointer hover:bg-muted/50' : ''}`}
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

                  {/* Account Cell - Inline Editable */}
                  <TableCell
                    onClick={() => setEditingField({ transactionId: transaction.id, field: 'account' })}
                    className="cursor-pointer hover:bg-muted/50 min-w-[120px] max-w-[180px]"
                  >
                    {isEditingAccount ? (
                      <Select
                        value={
                          transaction.account_id
                            ? `account-${transaction.account_id}`
                            : transaction.credit_card_id
                            ? `card-${transaction.credit_card_id}`
                            : 'none'
                        }
                        onValueChange={(value) => handleInlineAccountChange(transaction.id, value)}
                        onOpenChange={(open) => !open && setEditingField(null)}
                        open={true}
                      >
                        <SelectTrigger className="h-8">
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
                    ) : (
                      <div className="text-sm">
                        {getAccountDisplayName(transaction)}
                      </div>
                    )}
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell className="min-w-[120px]">
                    {transaction.status === 'excluded' && transaction.splits.length === 0 ? (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded whitespace-nowrap">
                        Uncategorized
                      </span>
                    ) : transaction.status === 'excluded' && transaction.duplicateType === 'database' ? (
                      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded whitespace-nowrap">
                        Duplicate
                      </span>
                    ) : transaction.status === 'excluded' && transaction.duplicateType === 'within-file' ? (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded whitespace-nowrap">
                        Potential Duplicate
                      </span>
                    ) : transaction.status === 'excluded' ? (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded whitespace-nowrap">
                        Excluded
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded whitespace-nowrap">
                        Ready
                      </span>
                    )}
                  </TableCell>

                  {/* Actions Cell */}
                  <TableCell className="text-right min-w-[160px]">
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
        databaseDuplicateCount={databaseDuplicateCount}
        withinFileDuplicateCount={withinFileDuplicateCount}
      />

      <ImportProgressDialog
        open={showProgress}
        status={progressStatus}
        message={progressMessage}
        onContinue={handleProgressContinue}
        importedCount={importedCount}
        isHistorical={isHistorical}
      />
    </div>
  );
}

