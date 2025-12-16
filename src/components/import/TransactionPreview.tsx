'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Category, Account, CreditCard } from '@/lib/types';
import TransactionEditDialog from './TransactionEditDialog';
import ImportConfirmationDialog from './ImportConfirmationDialog';
import ImportProgressDialog from './ImportProgressDialog';
import BulkEditDialog, { BulkEditUpdates } from './BulkEditDialog';
import { generateTransactionHash } from '@/lib/csv-parser';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';
import { MoreVertical, Edit, X, Check, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeature } from '@/contexts/FeatureContext';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';

interface TransactionPreviewProps {
  transactions: ParsedTransaction[];
  onImportComplete: () => void;
}

interface EditingField {
  transactionId: string;
  field: 'date' | 'amount' | 'category' | 'account';
}

export default function TransactionPreview({ transactions, onImportComplete }: TransactionPreviewProps) {
  const router = useRouter();
  const [items, setItems] = useState<ParsedTransaction[]>(transactions);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<ParsedTransaction | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [progressMessage, setProgressMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [dateFormat, setDateFormat] = useState<string | null>(null);
  const [isAICategorizing, setIsAICategorizing] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const { stats, refreshStats } = useAIUsage();
  const { isPremium } = useSubscription();
  const aiChatEnabled = useFeature('ai_chat');

  // Sync items state with transactions prop when it changes
  useEffect(() => {
    setItems(transactions);
  }, [transactions]);

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchCreditCards();
    
    // Load template info from sessionStorage
    const storedTemplateId = sessionStorage.getItem('csvTemplateId');
    if (storedTemplateId) {
      setTemplateId(parseInt(storedTemplateId, 10));
    }
    
    // Load date format from sessionStorage
    const storedDateFormat = sessionStorage.getItem('csvDateFormat');
    if (storedDateFormat) {
      setDateFormat(storedDateFormat);
    }

    // Load isHistorical from sessionStorage (set during processing)
    const storedIsHistorical = sessionStorage.getItem('importIsHistorical');
    if (storedIsHistorical === 'true') {
      setIsHistorical(true);
    }

    // Initialize per-transaction is_historical from global flag if not already set
    setItems(prevItems => prevItems.map(item => ({
      ...item,
      is_historical: item.is_historical !== undefined ? item.is_historical : (storedIsHistorical === 'true'),
    })));
  }, []);


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

  const handleInlineAccountChange = (transactionId: string, value: string) => {
    const updatedItems = items.map(item => {
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
    });
    setItems(updatedItems);
    setEditingField(null);
    
    // Save to database if queued import
    const updatedItem = updatedItems.find(item => item.id === transactionId);
    if (updatedItem) {
      saveQueuedImportChange(transactionId, {
        target_account_id: updatedItem.account_id || null,
        target_credit_card_id: updatedItem.credit_card_id || null,
      });
    }
  };

  const getAccountDisplayName = (transaction: ParsedTransaction): string => {
    if (transaction.account_id !== undefined && transaction.account_id !== null) {
      const account = accounts.find(a => a.id === transaction.account_id);
      return account ? account.name : `Account ${transaction.account_id}`;
    }
    if (transaction.credit_card_id !== undefined && transaction.credit_card_id !== null) {
      const card = creditCards.find(c => c.id === transaction.credit_card_id);
      return card ? card.name : `Card ${transaction.credit_card_id}`;
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

  // Helper function to save queued import changes to database
  const saveQueuedImportChange = async (transactionId: string, updates: any) => {
    // Check if this is a queued import
    if (typeof transactionId === 'string' && transactionId.startsWith('queued-')) {
      const queuedImportId = parseInt(transactionId.replace('queued-', ''));
      if (!isNaN(queuedImportId)) {
        try {
          await fetch('/api/automatic-imports/queue/update-transaction', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queuedImportId,
              ...updates,
            }),
          });
        } catch (error) {
          console.error('Error saving queued import change:', error);
          // Don't show error to user - just log it
        }
      }
    }
  };

  // Handle bulk edit save
  const handleBulkEditSave = async (updates: BulkEditUpdates) => {
    const selectedItems = items.filter(item => selectedTransactions.has(item.id));
    const isQueuedImport = selectedItems.some(item => typeof item.id === 'string' && item.id.startsWith('queued-'));

    if (!isQueuedImport) {
      toast.error('Bulk edit is only available for queued imports');
      return;
    }

    try {
      // Update database
      const response = await fetch('/api/automatic-imports/queue/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: selectedItems.map(item => {
            if (typeof item.id === 'string' && item.id.startsWith('queued-')) {
              return parseInt(item.id.replace('queued-', ''));
            }
            return null;
          }).filter(id => id !== null),
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transactions');
      }

      // Update local state
      const updatedItems = items.map(item => {
        if (!selectedTransactions.has(item.id)) {
          return item;
        }

        const updated = { ...item };

        if (updates.date !== undefined) {
          const newHash = generateTransactionHash(updates.date, item.description, item.amount, item.originalData);
          updated.date = updates.date;
          updated.hash = newHash;
        }

        if (updates.categoryId !== undefined) {
          if (updates.categoryId === null) {
            updated.splits = [];
            updated.suggestedCategory = undefined;
          } else {
            const category = categories.find(c => c.id === updates.categoryId);
            updated.splits = [{
              categoryId: updates.categoryId!,
              categoryName: category?.name || '',
              amount: item.amount,
            }];
            updated.suggestedCategory = updates.categoryId;
          }
        }

        if (updates.accountId !== undefined) {
          updated.account_id = updates.accountId;
        }
        if (updates.creditCardId !== undefined) {
          updated.credit_card_id = updates.creditCardId;
        }
        if (updates.accountId === null && updates.creditCardId === null) {
          updated.account_id = null;
          updated.credit_card_id = null;
        }

        if (updates.isHistorical !== undefined) {
          updated.is_historical = updates.isHistorical;
        }

        // Update status based on changes
        const hasCategory = updated.splits.length > 0;
        const isDuplicate = updated.isDuplicate || false;
        updated.status = (isDuplicate ? 'excluded' : (!hasCategory ? 'excluded' : 'pending')) as 'pending' | 'confirmed' | 'excluded';

        return updated;
      });

      setItems(updatedItems);
      setSelectedTransactions(new Set());
      toast.success(`Updated ${selectedItems.length} transaction${selectedItems.length !== 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Error saving bulk edits:', error);
      toast.error(error.message || 'Failed to save bulk edits');
    }
  };

  const handleInlineDateChange = (transactionId: string, newDate: string) => {
    const updatedItems = items.map(item => {
      if (item.id === transactionId) {
        // Recalculate hash when date changes (include originalData for uniqueness)
        const newHash = generateTransactionHash(newDate, item.description, item.amount, item.originalData);
        // Auto-include when date changes (unless it's a duplicate)
        const newStatus: 'pending' | 'confirmed' | 'excluded' = item.isDuplicate ? 'excluded' : 'pending';
        return { ...item, date: newDate, hash: newHash, isDuplicate: false, status: newStatus };
      }
      return item;
    });
    setItems(updatedItems);
    setEditingField(null);
    
    // Save to database if queued import
    const updatedItem = updatedItems.find(item => item.id === transactionId);
    if (updatedItem) {
      saveQueuedImportChange(transactionId, {
        transaction_date: updatedItem.date,
      });
    }
  };

  const handleInlineAmountChange = (transactionId: string, newAmount: string) => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount)) return;

    const updatedItems = items.map(item => {
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
            // Preserve isAICategorized flag when only amount changes
          }];
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
    setEditingField(null);
    
    // Save to database if queued import
    const updatedItem = updatedItems.find(item => item.id === transactionId);
    if (updatedItem) {
      saveQueuedImportChange(transactionId, {
        amount: updatedItem.amount,
      });
    }
  };

  const handleInlineCategoryChange = (transactionId: string, categoryId: string) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    if (!category) return;

    const updatedItems = items.map(item => {
      if (item.id === transactionId) {
        // Replace with a single split for the selected category
        // Auto-include when categorized (unless it's a duplicate)
        const newStatus: 'pending' | 'confirmed' | 'excluded' = item.isDuplicate ? 'excluded' : 'pending';
        return {
          ...item,
          status: newStatus,
          splits: [{
            categoryId: category.id,
            categoryName: category.name,
            amount: item.amount,
            isAICategorized: false, // User manually changed, clear AI flag
          }],
        };
      }
      return item;
    });
    setItems(updatedItems);
    setEditingField(null);
    
    // Save to database if queued import
    const updatedItem = updatedItems.find(item => item.id === transactionId);
    if (updatedItem && updatedItem.splits.length > 0) {
      saveQueuedImportChange(transactionId, {
        suggested_category_id: updatedItem.splits[0].categoryId,
      });
    }
  };

  const handleImportClick = () => {
    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleAICategorize = async () => {
    if (uncategorizedTransactions.length === 0) {
      toast.error('No uncategorized transactions to categorize');
      return;
    }

    if (!stats || stats.categorization.used >= stats.categorization.limit) {
      toast.error('Daily categorization limit reached. Try again tomorrow.');
      return;
    }

    setIsAICategorizing(true);

    try {
      // Use different endpoint based on whether these are queued imports
      const endpoint = isQueuedImport 
        ? '/api/import/ai-categorize-queued'
        : '/api/import/ai-categorize';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: uncategorizedTransactions.map(txn => ({
            id: txn.id,
            merchant: txn.merchant,
            description: txn.description,
            amount: txn.amount,
            date: txn.date,
            transaction_type: txn.transaction_type,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to categorize transactions' }));
        if (response.status === 429) {
          toast.error(`Rate limit exceeded. ${errorData.remaining || 0} requests remaining.`);
        } else {
          toast.error(errorData.error || 'Failed to categorize transactions');
        }
        return;
      }

      const result = await response.json();
      const { suggestions = [] } = result;

      if (suggestions.length === 0) {
        toast.info('No categories could be suggested for these transactions');
        return;
      }

      // Fetch categories to get names
      const categoriesResponse = await fetch('/api/categories?excludeGoals=true');
      const categories = await categoriesResponse.ok ? await categoriesResponse.json() : [];

      // Update transactions with AI suggestions
      setItems(items.map(transaction => {
        const suggestion = suggestions.find((s: any) => s.transactionId === transaction.id);
        
        if (suggestion && suggestion.categoryId && !transaction.isDuplicate) {
          const category = categories.find((c: any) => c.id === suggestion.categoryId);
          return {
            ...transaction,
            suggestedCategory: suggestion.categoryId,
            status: 'pending' as const,
            splits: [{
              categoryId: suggestion.categoryId,
              categoryName: category?.name || suggestion.categoryName,
              amount: transaction.amount,
              isAICategorized: true,
            }],
          };
        }
        
        return transaction;
      }));

      const categorizedCount = suggestions.filter((s: any) => s.categoryId).length;
      toast.success(`AI categorized ${categorizedCount} transaction${categorizedCount !== 1 ? 's' : ''}`);
      refreshStats();
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      toast.error('Failed to categorize transactions');
    } finally {
      setIsAICategorizing(false);
    }
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

    // Check if these are queued imports (IDs start with 'queued-')
    const isQueuedImport = toImport.some(txn => typeof txn.id === 'string' && txn.id.startsWith('queued-'));
    
    // Get filename from sessionStorage
    const fileName = sessionStorage.getItem('csvFileName') || sessionStorage.getItem('parsedFileName') || 'Unknown';
    
    // Get batchId from sessionStorage if it's a queued import
    const batchId = sessionStorage.getItem('queuedBatchId');

    // Show progress dialog
    setIsImporting(true);
    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage(`Importing ${toImport.length} transaction${toImport.length !== 1 ? 's' : ''}...`);

    try {
      let response;
      
      if (isQueuedImport && batchId) {
        // Use queued import approval endpoint
        response = await fetch('/api/automatic-imports/queue/approve-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            transactions: toImport.map(txn => ({
              ...txn,
              // Ensure hash is included (should already be in txn.hash from queued import)
              hash: txn.hash || '',
              // Use per-transaction is_historical if set, otherwise fall back to global flag
              is_historical: txn.is_historical !== undefined ? txn.is_historical : isHistorical,
            })),
          }),
        });
      } else {
        // Use regular import endpoint
        response = await fetch('/api/import/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: toImport.map(txn => ({
              ...txn,
              // Use per-transaction is_historical if set, otherwise fall back to global flag
              is_historical: txn.is_historical !== undefined ? txn.is_historical : isHistorical,
            })),
            isHistorical: isHistorical, // Keep for backward compatibility
            fileName: fileName,
          }),
        });
      }

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to import transactions');
        throw new Error(errorMessage || 'Failed to import transactions');
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
      // Error toast already shown by handleApiError
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

  // Exclude duplicates from uncategorized count - duplicates take precedence
  const uncategorizedCount = items.filter(item => 
    !item.isDuplicate && 
    !item.duplicateType && 
    item.splits.length === 0
  ).length;
  
  // Check if these are queued imports
  const isQueuedImport = items.some(item => typeof item.id === 'string' && item.id.startsWith('queued-'));
  
  // Get uncategorized transactions for AI categorization (both normal and queued imports)
  const uncategorizedTransactions = items.filter(
    item => !item.isDuplicate && 
            (!item.splits || item.splits.length === 0)
  );

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
      {/* Historical Import Indicator */}
      {isHistorical && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">📜 Historical Import:</span>
            <span>Default for all transactions (can be changed per transaction below)</span>
          </div>
        </div>
      )}
      
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
          <div className="flex gap-2 shrink-0">
            {selectedTransactions.size > 0 && (
              <Button
                onClick={() => setShowBulkEditDialog(true)}
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit ({selectedTransactions.size})
              </Button>
            )}
            {uncategorizedTransactions.length > 0 && (
              <>
                {/* Show AI Categorize button only if premium AND AI enabled */}
                {isPremium && aiChatEnabled && (
                  <Button
                    onClick={handleAICategorize}
                    disabled={isAICategorizing || !stats || stats.categorization.used >= stats.categorization.limit}
                    variant="default"
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isAICategorizing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Categorizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI Categorize ({uncategorizedTransactions.length})
                      </>
                    )}
                  </Button>
                )}
                {/* Show upgrade button if not premium */}
                {!isPremium && (
                  <Button
                    onClick={() => router.push('/settings/subscription')}
                    variant="default"
                    className="gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade for AI Categorization
                  </Button>
                )}
                {/* If premium but AI disabled, don't show anything */}
              </>
            )}
            <Button onClick={handleImportClick} disabled={isImporting || categorizedCount === 0}>
              {isImporting ? 'Importing...' : `Import ${categorizedCount} Transaction${categorizedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTransactions.size === items.length && items.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTransactions(new Set(items.map(t => t.id)));
                    } else {
                      setSelectedTransactions(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="whitespace-nowrap">Merchant</TableHead>
              <TableHead className="whitespace-nowrap">Description</TableHead>
              <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
              <TableHead className="whitespace-nowrap">Category</TableHead>
              <TableHead className="whitespace-nowrap">Account</TableHead>
              <TableHead className="whitespace-nowrap text-center">Historical</TableHead>
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

              // Determine row background color based on transaction status
              // Duplicates take precedence over uncategorized status
              const isDuplicate = transaction.duplicateType === 'database' || transaction.duplicateType === 'within-file' || transaction.isDuplicate;
              const isUncategorized = !isDuplicate && transaction.splits.length === 0;
              const isManuallyExcluded = transaction.status === 'excluded' && transaction.splits.length > 0 && !isDuplicate;
              const isReadyToImport = !isUncategorized && 
                                      !isDuplicate &&
                                      transaction.status !== 'excluded' && 
                                      transaction.splits.length > 0;

              // Duplicates get red background (highest priority)
              // Uncategorized transactions have no background (default table color)
              // Green background for ready to import
              // Red background for manually excluded (but not duplicates or uncategorized)
              const rowClassName = isDuplicate
                ? 'bg-red-50 dark:bg-red-950/20 border-border'
                : isUncategorized
                ? 'border-border'
                : isReadyToImport
                ? 'bg-green-50 dark:bg-green-900/30 border-border'
                : isManuallyExcluded
                ? 'bg-red-50 dark:bg-red-950/20 border-border'
                : 'border-border';

              const isSelected = selectedTransactions.has(transaction.id);

              return (
                <TableRow
                  key={transaction.id}
                  className={rowClassName}
                >
                  {/* Selection Checkbox */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedTransactions);
                        if (checked) {
                          newSelected.add(transaction.id);
                        } else {
                          newSelected.delete(transaction.id);
                        }
                        setSelectedTransactions(newSelected);
                      }}
                    />
                  </TableCell>
                  {/* Date Cell - Inline Editable */}
                  <TableCell
                    onClick={() => !isEditingDate && setEditingField({ transactionId: transaction.id, field: 'date' })}
                    className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
                  >
                    {isEditingDate ? (
                      <div onBlur={() => setEditingField(null)}>
                        <DatePicker
                          date={parseLocalDate(transaction.date)}
                          onDateChange={(date) => {
                            if (date) {
                              handleInlineDateChange(transaction.id, formatLocalDate(date));
                            }
                            setEditingField(null);
                          }}
                        />
                      </div>
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
                    className={`text-right font-semibold cursor-pointer hover:bg-muted/50 min-w-[100px] ${
                      transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
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
                      <div className="text-sm flex items-center gap-1.5">
                        {transaction.splits.length > 0 ? (
                          transaction.splits.length === 1 ? (
                            <>
                              <span>{transaction.splits[0].categoryName}</span>
                              {transaction.splits[0].isAICategorized && (
                                <span className="inline-flex items-center" title="AI categorized">
                                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                </span>
                              )}
                            </>
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
                          (transaction.account_id !== undefined && transaction.account_id !== null)
                            ? `account-${transaction.account_id}`
                            : (transaction.credit_card_id !== undefined && transaction.credit_card_id !== null)
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

                  {/* Historical Cell */}
                  <TableCell className="text-center min-w-[100px]">
                    <Checkbox
                      checked={transaction.is_historical ?? false}
                      onCheckedChange={async (checked) => {
                        const newValue = checked === true;
                        // Update local state
                        const updatedItems = items.map(item => 
                          item.id === transaction.id 
                            ? { ...item, is_historical: newValue }
                            : item
                        );
                        setItems(updatedItems);
                        
                        // Save to database if queued import
                        saveQueuedImportChange(transaction.id, {
                          is_historical: newValue,
                        });
                      }}
                      title="Mark as historical (won't affect current budget)"
                    />
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell className="min-w-[120px]">
                    {/* Duplicates take precedence over uncategorized status */}
                    {isDuplicate ? (
                      transaction.duplicateType === 'database' ? (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded whitespace-nowrap">
                          Duplicate
                        </span>
                      ) : transaction.duplicateType === 'within-file' ? (
                        <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded whitespace-nowrap">
                          Potential Duplicate
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded whitespace-nowrap">
                          Duplicate
                        </span>
                      )
                    ) : transaction.status === 'excluded' && transaction.splits.length === 0 ? (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded whitespace-nowrap">
                        Uncategorized
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleExclude(transaction.id)}>
                          {transaction.status === 'excluded' ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Include
                            </>
                          ) : (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              Exclude
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        transactions={items.filter(item => selectedTransactions.has(item.id))}
        categories={categories}
        accounts={accounts}
        creditCards={creditCards}
        open={showBulkEditDialog}
        onClose={() => setShowBulkEditDialog(false)}
        onSave={handleBulkEditSave}
      />
    </div>
  );
}

