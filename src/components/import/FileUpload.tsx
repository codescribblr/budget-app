'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import QueuedImportProcessingDialog from '@/components/import/QueuedImportProcessingDialog';
import { parseCSVFile } from '@/lib/csv-parser';
import { parseImageFile } from '@/lib/image-parser';
import { analyzeCSV } from '@/lib/column-analyzer';
import type { ParsedTransaction } from '@/lib/import-types';
import type { Account, CreditCard } from '@/lib/types';
import { toast } from 'sonner';
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
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);
  const [defaultCreditCardId, setDefaultCreditCardId] = useState<number | null>(null);
  const [isHistorical, setIsHistorical] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [queuedBatchId, setQueuedBatchId] = useState<string | null>(null);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
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
        
        // Check for matching template FIRST (before checking confidence)
        // This allows templates to automatically apply even if auto-detection has low confidence
        updateProgress(20, 'Checking for saved templates...');
        let templateFound = false;
        let templateId: number | undefined;
        let templateName: string | undefined;
        
        try {
          const { loadTemplate } = await import('@/lib/mapping-templates');
          const template = await loadTemplate(analysis.fingerprint);
          
          if (template && template.id) {
            templateFound = true;
            templateId = template.id;
            templateName = template.templateName;
            console.log('Found matching template:', { templateId, templateName, fingerprint: analysis.fingerprint });
          }
        } catch (err) {
          console.warn('Failed to check for template:', err);
          // Continue without template
        }
        
        // If template found, use it automatically (skip mapping page)
        if (templateFound) {
          updateProgress(30, `Using template: ${templateName || 'Saved Template'}...`);
          // Parse CSV with template mapping
          const result = await parseCSVFile(file);
          transactions = result.transactions;
          
          // Store CSV data and template info
          sessionStorage.setItem('csvData', JSON.stringify(rawData));
          sessionStorage.setItem('csvFileName', file.name);
          sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
          sessionStorage.setItem('csvMappingName', templateName || 'Saved Template');
          sessionStorage.setItem('csvTemplateId', templateId!.toString());
          if (result.fingerprint) {
            sessionStorage.setItem('csvFingerprint', result.fingerprint);
          }
          if (result.dateFormat) {
            sessionStorage.setItem('csvDateFormat', result.dateFormat);
          }
        } else {
          // No template found - check if we have high confidence for auto-detection
          updateProgress(20, 'Mapping CSV fields...');
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to make it visible
          
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
            updateProgress(30, 'Parsing CSV transactions...');
            // Auto-import with detected mapping (no template)
            const result = await parseCSVFile(file);
            transactions = result.transactions;
            
            // Generate automatic mapping name
            const { generateAutomaticMappingName } = await import('@/lib/mapping-name-generator');
            const mappingName = generateAutomaticMappingName(analysis, file.name);
            
            // Store CSV data and template info for potential re-processing
            sessionStorage.setItem('csvData', JSON.stringify(rawData));
            sessionStorage.setItem('csvFileName', file.name);
            sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
            sessionStorage.setItem('csvMappingName', mappingName);
            if (result.fingerprint) {
              sessionStorage.setItem('csvFingerprint', result.fingerprint);
            }
            if (result.dateFormat) {
              sessionStorage.setItem('csvDateFormat', result.dateFormat);
            }
          } else {
            // No template and low confidence - navigate to mapping page
            sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
            sessionStorage.setItem('csvData', JSON.stringify(rawData));
            sessionStorage.setItem('csvFileName', file.name);
            router.push('/import/map-columns');
            setIsProcessing(false);
            return;
          }
        }
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
            
            // Convert PDF transactions to CSV format for mapping support
            // Create CSV data: [headers, ...rows]
            // Format: Date, Description, Amount, Transaction Type
            const csvData: string[][] = [
              ['Date', 'Description', 'Amount', 'Transaction Type'], // Headers
              ...transactions.map(txn => [
                txn.date,
                txn.description,
                (txn.transaction_type === 'expense' ? '-' : '') + txn.amount.toFixed(2),
                txn.transaction_type,
              ]),
            ];
            
            // Analyze CSV structure (same as regular CSV)
            updateProgress(25, 'Analyzing PDF structure...');
            const analysis = analyzeCSV(csvData);
            
            // Show mapping step for longer so user can see it
            updateProgress(30, 'Mapping CSV fields...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to make it visible
            
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
                return true;
              });

            if (highConfidence) {
              // Generate mapping name for PDF
              const { generateAutomaticMappingName } = await import('@/lib/mapping-name-generator');
              const mappingName = generateAutomaticMappingName(analysis, file.name);
              
              // Auto-process PDF transactions (they're already parsed)
              // Store CSV data for potential re-mapping
              sessionStorage.setItem('csvData', JSON.stringify(csvData));
              sessionStorage.setItem('csvFileName', file.name);
              sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
              sessionStorage.setItem('csvMappingName', mappingName);
              // Use analysis fingerprint for PDF CSV data
              sessionStorage.setItem('csvFingerprint', analysis.fingerprint);
            } else {
              // Navigate to mapping page for PDF (same as CSV)
              sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
              sessionStorage.setItem('csvData', JSON.stringify(csvData));
              sessionStorage.setItem('csvFileName', file.name);
              router.push('/import/map-columns');
              setIsProcessing(false);
              return;
            }
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
            return;
          }
          throw new Error(errorData.error || 'Failed to parse PDF');
        }
      } else {
        setError('Unsupported file type. Please upload a CSV or PDF file.');
        setIsProcessing(false);
        setProgress(0);
        setProgressStage('');
        return;
      }

      if (transactions.length === 0) {
        setError('No transactions found in the file');
        setIsProcessing(false);
        setProgress(0);
        setProgressStage('');
        return;
      }

      updateProgress(90, 'Saving to import queue...');
      
      // Get CSV data from sessionStorage if available (for PDFs and CSVs that went through mapping)
      const csvDataStr = sessionStorage.getItem('csvData');
      const csvAnalysisStr = sessionStorage.getItem('csvAnalysis');
      const csvFingerprintStr = sessionStorage.getItem('csvFingerprint');
      const csvTemplateIdStr = sessionStorage.getItem('csvTemplateId');
      const csvMappingNameStr = sessionStorage.getItem('csvMappingName');
      
      const csvData = csvDataStr ? JSON.parse(csvDataStr) : undefined;
      const csvAnalysis = csvAnalysisStr ? JSON.parse(csvAnalysisStr) : undefined;
      const csvFingerprint = csvFingerprintStr || undefined;
      const csvMappingTemplateId = csvTemplateIdStr ? parseInt(csvTemplateIdStr, 10) : undefined;
      const csvMappingName = csvMappingNameStr || undefined;
      
      // Save raw transactions to queue (without processing - dialog will handle that)
      const saveResponse = await fetch('/api/import/queue-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: transactions, // Raw transactions, not processed
          fileName: file.name,
          targetAccountId: defaultAccountId,
          targetCreditCardId: defaultCreditCardId,
          isHistorical: isHistorical,
          csvData,
          csvAnalysis,
          csvFingerprint,
          csvMappingTemplateId,
          csvMappingName,
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Failed to save import' }));
        throw new Error(errorData.error || 'Failed to save import');
      }

      const saveResult = await saveResponse.json();
      setQueuedBatchId(saveResult.batchId);
      setIsProcessing(false);
      setShowProcessingDialog(true); // Show dialog to handle processing
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setProgress(0);
      setProgressStage('');
      setIsProcessing(false);
      setShowProcessingDialog(false);
      setQueuedBatchId(null);
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

  const handleProcessingComplete = () => {
    if (!queuedBatchId) return;
    setShowProcessingDialog(false);
    // Navigate to review page with a small delay to ensure database updates are committed
    setTimeout(() => {
      router.push(`/imports/queue/${queuedBatchId}?t=${Date.now()}`);
    }, 300);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.pdf"
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
          <div className="text-4xl">{isDragging && !disabled ? '📥' : '📄'}</div>
          <div>
            <p className="text-lg font-medium">
              {isDragging && !disabled ? 'Drop file here' : 'Upload CSV or PDF'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isDragging && !disabled
                ? 'Release to upload'
                : disabled
                ? 'Read-only users cannot import transactions'
                : 'Upload a CSV file or PDF statement of transactions'}
            </p>
          </div>
          <Button onClick={handleButtonClick} disabled={isProcessing || disabled}>
            {isProcessing ? 'Processing...' : 'Choose File'}
          </Button>
        </div>
      </div>


      {/* Processing Dialog */}
      {queuedBatchId && (
        <QueuedImportProcessingDialog
          open={showProcessingDialog}
          progress={progress}
          stage={progressStage}
          batchId={queuedBatchId}
          onComplete={handleProcessingComplete}
          onCancel={() => {
            setShowProcessingDialog(false);
            setQueuedBatchId(null);
          }}
        />
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
                  // AI categorization is now done on-demand in TransactionPreview
                  const processedTransactions = await processTransactions(
                    aiResult.transactions,
                    undefined,
                    undefined,
                    true, // Always skip AI categorization - user can trigger it manually in preview
                    updateProgress
                  );

                  // Apply default account/card and historical flag to transactions before saving
                  const transactionsWithDefaults = processedTransactions.map(txn => ({
                    ...txn,
                    account_id: (txn.account_id !== undefined && txn.account_id !== null) ? txn.account_id : (defaultAccountId || null),
                    credit_card_id: (txn.credit_card_id !== undefined && txn.credit_card_id !== null) ? txn.credit_card_id : (defaultCreditCardId || null),
                    is_historical: isHistorical,
                  }));

                  // Save raw transactions to queue (without processing - dialog will handle that)
                  updateProgress(90, 'Saving to import queue...');
                  const saveResponse = await fetch('/api/import/queue-manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      transactions: aiResult.transactions, // Raw transactions, not processed
                      fileName: pendingFile!.name,
                      targetAccountId: defaultAccountId,
                      targetCreditCardId: defaultCreditCardId,
                      isHistorical: isHistorical,
                    }),
                  });

                  if (!saveResponse.ok) {
                    const errorData = await saveResponse.json().catch(() => ({ error: 'Failed to save import' }));
                    throw new Error(errorData.error || 'Failed to save import');
                  }

                  const saveResult = await saveResponse.json();
                  setQueuedBatchId(saveResult.batchId);
                  setIsProcessing(false);
                  setShowProcessingDialog(true); // Show dialog to handle processing
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
        </div>
      )}

      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>CSV Files:</strong> Any bank statement format (auto-detected)</li>
          <li><strong>PDF Files:</strong> Bank statements and transaction history</li>
        </ul>
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


