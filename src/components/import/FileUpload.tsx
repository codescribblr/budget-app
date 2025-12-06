'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, AlertCircle, Crown } from 'lucide-react';
import { parseCSVFile } from '@/lib/csv-parser';
import { parseImageFile } from '@/lib/image-parser';
import { analyzeCSV } from '@/lib/column-analyzer';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeature } from '@/contexts/FeatureContext';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Account, CreditCard } from '@/lib/types';
import Papa from 'papaparse';

interface FileUploadProps {
  onFileUploaded: (transactions: ParsedTransaction[], fileName: string) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFileUploaded, disabled = false }: FileUploadProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAIFallback, setShowAIFallback] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [enableAICategorization, setEnableAICategorization] = useState(false); // Disabled by default
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);
  const [defaultCreditCardId, setDefaultCreditCardId] = useState<number | null>(null);
  const [isHistorical, setIsHistorical] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [processedTransactions, setProcessedTransactions] = useState<ParsedTransaction[] | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string>('');
  const [processingComplete, setProcessingComplete] = useState(false);
  const { stats, loading: statsLoading } = useAIUsage();
  const { isPremium } = useSubscription();
  const aiChatEnabled = useFeature('ai_chat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Fetch accounts and credit cards on mount
  useEffect(() => {
    fetchAccounts();
    fetchCreditCards();
  }, []);

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

  // Progress callback function
  const updateProgress = (value: number, stage: string) => {
    setProgress(value);
    setProgressStage(stage);
  };

  // Process a file (used by both file input and drag-drop)
  const processFile = async (file: File) => {
    if (disabled) {
      setError('You only have read access to this account. Only account owners and editors can import transactions.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressStage('');

    try {
      let transactions: ParsedTransaction[];

      // Determine file type and use appropriate parser
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || fileType === 'text/csv') {
        updateProgress(5, 'Reading CSV file...');
        // Parse CSV first to get raw data
        const rawData = await parseCSVToArray(file);
        
        updateProgress(15, 'Analyzing CSV structure...');
        // Analyze CSV structure
        const analysis = analyzeCSV(rawData);
        
        // Check if we have high confidence for all required fields
        const hasRequiredFields = 
          analysis.dateColumn !== null &&
          analysis.amountColumn !== null &&
          analysis.descriptionColumn !== null;
        
        const highConfidence = hasRequiredFields &&
          analysis.columns.every(col => {
            if (col.fieldType === 'date' && col.columnIndex === analysis.dateColumn) {
              return col.confidence >= 0.85;
            }
            if (col.fieldType === 'amount' && col.columnIndex === analysis.amountColumn) {
              return col.confidence >= 0.85;
            }
            if (col.fieldType === 'description' && col.columnIndex === analysis.descriptionColumn) {
              return col.confidence >= 0.85;
            }
            return true; // Other columns don't need high confidence
          });

        if (highConfidence) {
          updateProgress(25, 'Parsing CSV transactions...');
          // Auto-import with detected mapping
          const result = await parseCSVFile(file);
          transactions = result.transactions;
          
          // Store CSV data and template info for potential re-processing
          sessionStorage.setItem('csvData', JSON.stringify(rawData));
          sessionStorage.setItem('csvFileName', file.name);
          if (result.templateId) {
            sessionStorage.setItem('csvTemplateId', result.templateId.toString());
          }
          if (result.fingerprint) {
            sessionStorage.setItem('csvFingerprint', result.fingerprint);
          }
          if (result.dateFormat) {
            sessionStorage.setItem('csvDateFormat', result.dateFormat);
          }
        } else {
          // Navigate to mapping page
          sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
          sessionStorage.setItem('csvData', JSON.stringify(rawData));
          sessionStorage.setItem('csvFileName', file.name);
          router.push('/import/map-columns');
          setIsProcessing(false);
          setProcessingComplete(false);
          return;
        }
      } else if (
        fileType.startsWith('image/') ||
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.png')
      ) {
        updateProgress(10, 'Processing image with AI...');
        // Images use AI parsing
        const parseResult = await parseImageFile(file, true);
        
        if (parseResult.error || parseResult.transactions.length === 0) {
          throw new Error(parseResult.error || 'No transactions found in the file');
        }
        
        transactions = parseResult.transactions;
        sessionStorage.setItem('csvFileName', file.name);
      } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
        updateProgress(10, 'Converting PDF to text...');
        // Parse PDF using local parser first
        const formData = new FormData();
        formData.append('file', file);

        updateProgress(20, 'Extracting transactions from PDF...');
        const response = await fetch('/api/import/process-pdf', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.transactions && result.transactions.length > 0) {
            transactions = result.transactions;
            sessionStorage.setItem('csvFileName', file.name);
          } else {
            throw new Error('No transactions found in PDF');
          }
        } else {
          // PDF parsing failed, offer AI fallback
          const errorData = await response.json();
          if (errorData.canFallbackToAI) {
            setPendingFile(file);
            setFallbackError(errorData.error || 'PDF parsing failed. AI fallback available.');
            setShowAIFallback(true);
            setIsProcessing(false);
            setProcessingComplete(false);
            return;
          }
          throw new Error(errorData.error || 'Failed to parse PDF');
        }
      } else {
        setError('Unsupported file type. Please upload a CSV or image file.');
        setIsProcessing(false);
        setProcessingComplete(false);
        setProgress(0);
        setProgressStage('');
        return;
      }

      if (transactions.length === 0) {
        setError('No transactions found in the file');
        setIsProcessing(false);
        setProcessingComplete(false);
        setProgress(0);
        setProgressStage('');
        return;
      }

      updateProgress(40, `Found ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}. Checking for duplicates...`);

      // Check for duplicates and auto-categorize
      const { processTransactions } = await import('@/lib/csv-parser-helpers');
      // Skip AI categorization if disabled OR if limit is reached
      const shouldSkipAI = !enableAICategorization || 
        (stats ? stats.categorization.used >= stats.categorization.limit : false);
      
      const processedTransactions = await processTransactions(
        transactions,
        undefined,
        undefined,
        shouldSkipAI,
        updateProgress
      );

      // Store processed transactions and pause for user to set options
      setProcessedTransactions(processedTransactions);
      setProcessedFileName(file.name);
      setProcessingComplete(true);
      updateProgress(100, 'Processing complete! Review your import options below.');
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setProgress(0);
      setProgressStage('');
      setIsProcessing(false);
      setProcessingComplete(false);
      setProcessedTransactions(null);
      setProcessedFileName('');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag and drop handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (disabled) {
        setError('You only have read access to this account. Only account owners and editors can import transactions.');
        return;
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    };

    // Add event listeners to document
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    // Cleanup
    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinueToPreview = () => {
    if (!processedTransactions) return;

    // Apply default account/card to transactions that don't have one set
    const transactionsWithDefaults = processedTransactions.map(txn => ({
      ...txn,
      // Only set default if transaction doesn't already have an account/card set
      account_id: (txn.account_id !== undefined && txn.account_id !== null) ? txn.account_id : (defaultAccountId || null),
      credit_card_id: (txn.credit_card_id !== undefined && txn.credit_card_id !== null) ? txn.credit_card_id : (defaultCreditCardId || null),
    }));

    // Store isHistorical in sessionStorage for TransactionPreview
    sessionStorage.setItem('importIsHistorical', isHistorical.toString());

    // Reset processing state
    setIsProcessing(false);
    setProcessingComplete(false);
    setProgress(0);
    setProgressStage('');
    setProcessedTransactions(null);
    setProcessedFileName('');

    // Move to preview
    onFileUploaded(transactionsWithDefaults, processedFileName);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.jpg,.jpeg,.png,.pdf,image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        isDragging && !disabled
          ? 'border-primary bg-primary/5 scale-105 shadow-lg'
          : disabled
          ? 'border-gray-200 dark:border-gray-800 opacity-50'
          : 'border-gray-300 dark:border-gray-700'
      }`}>
        <div className="space-y-4">
          <div className="text-4xl">{isDragging && !disabled ? '📥' : '📄 📷'}</div>
          <div>
            <p className="text-lg font-medium">
              {isDragging && !disabled ? 'Drop file here' : 'Upload CSV or Image'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isDragging && !disabled
                ? 'Release to upload'
                : disabled
                ? 'Read-only users cannot import transactions'
                : 'Upload a CSV file or screenshot/photo of transactions'}
            </p>
          </div>
          <Button onClick={handleButtonClick} disabled={isProcessing || disabled}>
            {isProcessing ? 'Processing...' : 'Choose File'}
          </Button>
          {(isProcessing || processingComplete) && (
            <div className="w-full space-y-4 mt-4">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progressStage || 'Processing...'}</span>
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              {/* Import Options - shown during and after processing */}
              <div className="mt-6 pt-4 border-t space-y-4">
                <div className="text-sm font-medium text-foreground">Import Options</div>
                
                {/* Historical Import Option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="historical-processing"
                    checked={isHistorical}
                    onCheckedChange={(checked) => setIsHistorical(checked as boolean)}
                  />
                  <Label
                    htmlFor="historical-processing"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Import as historical (won&apos;t affect current envelope balances)
                  </Label>
                </div>

                {/* Default Account/Card Option */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <Label htmlFor="default-account-processing" className="text-sm font-medium sm:min-w-[140px]">
                    Default Account/Card:
                  </Label>
                  <Select 
                    value={getDefaultAccountValue()} 
                    onValueChange={handleDefaultAccountChange}
                  >
                    <SelectTrigger id="default-account-processing" className="w-full sm:w-[250px]">
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

                {/* Continue Button - shown only when processing is complete */}
                {processingComplete && (
                  <div className="pt-2">
                    <Button 
                      onClick={handleContinueToPreview} 
                      className="w-full"
                    >
                      Continue to Preview
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Categorization Settings */}
      {!disabled && (
        // Hide card if user is premium but feature is disabled
        !(isPremium && !aiChatEnabled) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Categorization
                {!isPremium && (
                  <Badge
                    variant="default"
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs shrink-0"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Automatically categorize uncategorized transactions using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Checkbox
                    id="enable-ai-categorization"
                    checked={enableAICategorization}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        setEnableAICategorization(true);
                      } else {
                        setEnableAICategorization(false);
                      }
                    }}
                    disabled={statsLoading || isProcessing || !isPremium || !aiChatEnabled}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="enable-ai-categorization"
                    className={`text-sm font-medium leading-normal block ${
                      !isPremium || !aiChatEnabled
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-pointer'
                    }`}
                  >
                    Enable AI categorization
                  </label>
                  {!isPremium && (
                    <div className="text-sm text-muted-foreground">
                      <span>Upgrade to Premium to enable AI categorization</span>
                    </div>
                  )}
                  {isPremium && !aiChatEnabled && (
                    <div className="text-sm text-muted-foreground">
                      <span>Enable AI features in Settings to use this feature</span>
                    </div>
                  )}
                  {isPremium && aiChatEnabled && !statsLoading && stats && (
                    <div className="text-sm text-muted-foreground">
                      {enableAICategorization ? (
                        stats.categorization.used >= stats.categorization.limit ? (
                          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Daily limit reached ({stats.categorization.used}/{stats.categorization.limit}). AI categorization will be skipped.</span>
                          </div>
                        ) : (
                          <span>
                            {stats.categorization.limit - stats.categorization.used} attempt{stats.categorization.limit - stats.categorization.used !== 1 ? 's' : ''} remaining today
                          </span>
                        )
                      ) : (
                        <span>AI categorization will be skipped. Only rule-based categorization will be used.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {showAIFallback && pendingFile && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md space-y-3">
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              PDF parsing failed
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {fallbackError}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                setShowAIFallback(false);
                setIsProcessing(true);
                setError(null);
                setProgress(0);
                setProgressStage('');
                try {
                  updateProgress(10, 'Processing PDF with AI...');
                  const aiResult = await parseImageFile(pendingFile!, true);
                  if (aiResult.error) {
                    throw new Error(aiResult.error);
                  }
                  if (aiResult.transactions.length === 0) {
                    throw new Error('No transactions found in the file');
                  }
                  
                  updateProgress(40, `Found ${aiResult.transactions.length} transaction${aiResult.transactions.length !== 1 ? 's' : ''}. Checking for duplicates...`);
                  const { processTransactions } = await import('@/lib/csv-parser-helpers');
                  // Skip AI categorization if disabled OR if limit is reached
                  const shouldSkipAI = !enableAICategorization || 
                    (stats ? stats.categorization.used >= stats.categorization.limit : false);
                  const processedTransactions = await processTransactions(
                    aiResult.transactions,
                    undefined,
                    undefined,
                    shouldSkipAI,
                    updateProgress
                  );

                  // Store processed transactions and pause for user to set options
                  setProcessedTransactions(processedTransactions);
                  setProcessedFileName(pendingFile!.name);
                  setProcessingComplete(true);
                  updateProgress(100, 'Processing complete! Review your import options below.');
                  sessionStorage.setItem('csvFileName', pendingFile!.name);
                  setPendingFile(null);
                } catch (err) {
                  console.error('Error processing file with AI:', err);
                  setError(err instanceof Error ? err.message : 'Failed to process file with AI');
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
            >
              Try AI Parsing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAIFallback(false);
                setPendingFile(null);
                setFallbackError(null);
                setError('PDF parsing cancelled');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            💡 AI parsing requires OpenAI API key configured in your environment
          </p>
        </div>
      )}

      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>CSV Files:</strong> Any bank statement format (auto-detected)</li>
          <li><strong>Screenshots:</strong> Bank statements, transaction history</li>
          <li><strong>Photos:</strong> Receipts, mobile banking screenshots</li>
          <li><strong>Images:</strong> JPG, PNG, PDF</li>
        </ul>
        <p className="text-xs mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
          💡 <strong>Image processing requires OpenAI API key.</strong> Add OPENAI_API_KEY to your .env.local file.
        </p>
      </div>
    </div>
  );
}

/**
 * Parse CSV file to raw array
 */
function parseCSVToArray(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        resolve(results.data as string[][]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

