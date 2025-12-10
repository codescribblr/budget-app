'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { processTransactions } from '@/lib/csv-parser-helpers';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Account, CreditCard } from '@/lib/types';
import { toast } from 'sonner';

interface QueuedImportProcessingDialogProps {
  open: boolean;
  progress: number;
  stage: string;
  batchId?: string; // Optional: if provided, will check status and allow account selection
  onComplete?: () => void; // Called when user clicks "Continue to Review"
  onCancel?: () => void; // Called when user cancels
}

export default function QueuedImportProcessingDialog({
  open,
  progress,
  stage,
  batchId,
  onComplete,
  onCancel,
}: QueuedImportProcessingDialogProps) {
  const [status, setStatus] = useState<{
    processingTasks: any;
    incompleteTasks: string[];
    needsProcessing: boolean;
    defaultAccountId: number | null;
    defaultCreditCardId: number | null;
    isHistorical: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);
  const [defaultCreditCardId, setDefaultCreditCardId] = useState<number | null>(null);
  const [isHistorical, setIsHistorical] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(progress);
  const [currentStage, setCurrentStage] = useState(stage);
  const [processingResults, setProcessingResults] = useState<{
    totalTransactions: number;
    databaseDuplicates: number;
    withinFileDuplicates: number;
    categorizedCount: number;
    fileName: string;
    mappingName: string | null;
  } | null>(null);

  useEffect(() => {
    setCurrentProgress(progress);
    setCurrentStage(stage);
  }, [progress, stage]);

  useEffect(() => {
    if (open && batchId) {
      fetchStatus();
      fetchAccounts();
      fetchCreditCards();
    } else if (!batchId) {
      // Simple mode - just show progress
      setProcessingComplete(false);
    }
  }, [open, batchId]);

  const fetchStatus = async (autoStartProcessing: boolean = true) => {
    if (!batchId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/import/queue/${encodeURIComponent(batchId)}/processing-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch processing status');
      }
      const data = await response.json();
      setStatus(data);
      setDefaultAccountId(data.defaultAccountId);
      setDefaultCreditCardId(data.defaultCreditCardId);
      setIsHistorical(data.isHistorical || false);
      setLoading(false);

      // If processing is needed and we're allowed to auto-start, start it automatically
      // Don't auto-start if we're already processing or if this is just a status refresh
      if (autoStartProcessing && data.needsProcessing && !isProcessing) {
        startProcessing();
      } else if (!data.needsProcessing) {
        setProcessingComplete(true);
      }
    } catch (error: any) {
      console.error('Error fetching status:', error);
      toast.error('Failed to load processing status');
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCreditCards = async () => {
    try {
      const response = await fetch('/api/credit-cards');
      if (response.ok) {
        const data = await response.json();
        setCreditCards(data || []);
      }
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  };


  const startProcessing = async () => {
    if (!batchId) return;
    try {
      setIsProcessing(true);
      setCurrentProgress(0);
      setCurrentStage('Loading transactions...');

      // Fetch queued imports
      const response = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch transactions');
      }

      const data = await response.json();
      const queuedImports = data.imports || [];

      if (queuedImports.length === 0) {
        throw new Error('No transactions found for this batch');
      }

      const firstImport = queuedImports[0];
      const csvFileName = firstImport.csv_file_name || 'Unknown';

      setCurrentStage(`Found ${queuedImports.length} transaction${queuedImports.length !== 1 ? 's' : ''}...`);

      // Convert to ParsedTransaction format
      const initialTransactions: ParsedTransaction[] = queuedImports.map((qi: any) => ({
        id: `queued-${qi.id}`,
        date: qi.transaction_date,
        description: qi.description,
        amount: qi.amount,
        transaction_type: qi.transaction_type,
        merchant: qi.merchant,
        suggestedCategory: qi.suggested_category_id || undefined,
        account_id: qi.target_account_id || undefined,
        credit_card_id: qi.target_credit_card_id || undefined,
        is_historical: qi.is_historical || false,
        splits: [],
        status: 'pending' as const,
        isDuplicate: false,
        originalData: qi.original_data,
        hash: qi.hash || '',
      }));

      // Process transactions
      const updateProgress = (prog: number, stg: string) => {
        setCurrentProgress(prog);
        setCurrentStage(stg);
      };

      const processedTransactions = await processTransactions(
        initialTransactions,
        defaultAccountId || undefined,
        defaultCreditCardId || undefined,
        true, // Skip AI categorization - user can trigger it manually on review page
        updateProgress,
        undefined, // baseUrl
        batchId // Pass batchId so tasks mark themselves complete
      );

      // Calculate processing results from processed transactions
      const databaseDuplicates = processedTransactions.filter(t => t.duplicateType === 'database').length;
      const withinFileDuplicates = processedTransactions.filter(t => t.duplicateType === 'within-file').length;
      const categorizedCount = processedTransactions.filter(t => t.suggestedCategory !== null && t.suggestedCategory !== undefined).length;
      
      // Set processing results
      setProcessingResults({
        totalTransactions: processedTransactions.length,
        databaseDuplicates,
        withinFileDuplicates,
        categorizedCount,
        fileName: csvFileName,
        mappingName: firstImport.csv_mapping_name || null,
      });

      // Update queued imports with categorization results
      setCurrentStage('Updating categorization results...');
      const updateResponse = await fetch('/api/automatic-imports/queue/update-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: processedTransactions }),
      });

      if (!updateResponse.ok) {
        console.warn('Failed to update queued imports with categorization results');
      }

      setCurrentProgress(100);
      setCurrentStage('Processing complete!');
      setProcessingComplete(true);
      setIsProcessing(false);

      // Refresh status to show updated tasks (but don't trigger processing again)
      await fetchStatus(false); // Pass false to prevent auto-starting processing
    } catch (error: any) {
      console.error('Error processing batch:', error);
      toast.error(error.message || 'Failed to process batch');
      setIsProcessing(false);
    }
  };

  const handleAccountChange = (value: string) => {
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

  const getAccountValue = (): string => {
    if (defaultCreditCardId) return `card-${defaultCreditCardId}`;
    if (defaultAccountId) return `account-${defaultAccountId}`;
    return 'none';
  };

  const handleContinue = async () => {
    if (!processingComplete || !batchId) return;

    setIsSubmitting(true);
    try {
      // Update batch with default account and historical flag
      const updateResponse = await fetch(`/api/automatic-imports/queue/update-batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          targetAccountId: defaultAccountId,
          targetCreditCardId: defaultCreditCardId,
          isHistorical: isHistorical,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update batch settings');
      }

      // Task completion is handled by the update-batch API route
      // Call completion handler
      onComplete?.();
    } catch (error: any) {
      console.error('Error updating batch:', error);
      toast.error(error.message || 'Failed to update batch settings');
      setIsSubmitting(false);
    }
  };


  // Simple mode: just show progress (backward compatible)
  if (!batchId) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-[500px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Processing Transactions</DialogTitle>
            <DialogDescription>
              Categorizing transactions and checking for duplicates...
            </DialogDescription>
          </DialogHeader>

          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
              <div className="text-center space-y-2 w-full">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {currentStage || 'Processing transactions...'}
                </p>
                <div className="w-full max-w-sm mx-auto space-y-2 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-900 dark:text-gray-100">{Math.round(currentProgress)}%</span>
                  </div>
                  <Progress value={currentProgress} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Enhanced mode: show task status and account selection
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (!isProcessing && !isSubmitting && onCancel) {
            onCancel();
          } else {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Processing Import Batch</DialogTitle>
          <DialogDescription>
            {isProcessing 
              ? 'Processing transactions and checking for duplicates...'
              : processingComplete
              ? 'Processing complete! Set default account and continue to review.'
              : loading
              ? 'Checking processing status...'
              : 'Categorizing transactions and checking for duplicates...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isProcessing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="text-center font-medium">{currentStage}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(currentProgress)}%</span>
                  </div>
                  <Progress value={currentProgress} className="h-2" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Processing Results */}
              {processingComplete && processingResults && (
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-semibold">Processing Results</Label>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    {/* Filename on its own line at the top */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">File:</span>
                      <span className="ml-2 font-medium">{processingResults.fileName}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {/* Row 1: Mapping | Total Transactions */}
                      {processingResults.mappingName && (
                        <div>
                          <span className="text-muted-foreground">Mapping:</span>
                          <span className="ml-2 font-medium">{processingResults.mappingName}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Total Transactions:</span>
                        <span className="ml-2 font-medium">{processingResults.totalTransactions}</span>
                      </div>
                      {/* Row 2: Categorized | Duplicates */}
                      <div>
                        <span className="text-muted-foreground">Categorized:</span>
                        <span className="ml-2 font-medium">{processingResults.categorizedCount} / {processingResults.totalTransactions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duplicates:</span>
                        <span className="ml-2 font-medium">
                          {processingResults.databaseDuplicates === 0 && processingResults.withinFileDuplicates === 0 ? (
                            <span className="text-green-600 dark:text-green-400">None</span>
                          ) : (
                            <>
                              {processingResults.databaseDuplicates > 0 && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {processingResults.databaseDuplicates}
                                </span>
                              )}
                              {processingResults.databaseDuplicates > 0 && processingResults.withinFileDuplicates > 0 && (
                                <span className="mx-1">•</span>
                              )}
                              {processingResults.withinFileDuplicates > 0 && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {processingResults.withinFileDuplicates} within file{processingResults.withinFileDuplicates !== 1 ? 's' : ''}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Default Account Selection */}
              {processingComplete && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-account">Default Account</Label>
                    <Select value={getAccountValue()} onValueChange={handleAccountChange}>
                      <SelectTrigger id="default-account">
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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="historical"
                      checked={isHistorical}
                      onCheckedChange={(checked) => setIsHistorical(checked === true)}
                    />
                    <Label htmlFor="historical" className="text-sm font-normal cursor-pointer">
                      Mark transactions as historical (won't affect current budget)
                    </Label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && !isProcessing && !isSubmitting && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {processingComplete && (
            <Button onClick={handleContinue} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Continue to Review'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

