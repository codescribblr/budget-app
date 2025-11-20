'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { parseCSVFile } from '@/lib/csv-parser';
import { parseImageFile } from '@/lib/image-parser';
import { analyzeCSV } from '@/lib/column-analyzer';
import { saveTemplate } from '@/lib/mapping-templates';
import type { ParsedTransaction } from '@/lib/import-types';
import type { ColumnMapping } from '@/lib/mapping-templates';
import ColumnMappingDialog from './ColumnMappingDialog';
import Papa from 'papaparse';

interface FileUploadProps {
  onFileUploaded: (transactions: ParsedTransaction[], fileName: string) => void;
}

export default function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [csvAnalysis, setCsvAnalysis] = useState<any>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setShowMappingDialog(false);

    try {
      let transactions: ParsedTransaction[];

      // Determine file type and use appropriate parser
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || fileType === 'text/csv') {
        // Parse CSV first to get raw data
        const rawData = await parseCSVToArray(file);
        
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
          // Auto-import with detected mapping
          transactions = await parseCSVFile(file);
        } else {
          // Show mapping dialog for user confirmation
          setCsvAnalysis(analysis);
          setCsvData(rawData);
          setPendingFileName(file.name);
          setShowMappingDialog(true);
          setIsProcessing(false);
          return;
        }
      } else if (
        fileType.startsWith('image/') ||
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.png') ||
        fileName.endsWith('.pdf')
      ) {
        transactions = await parseImageFile(file);
      } else {
        setError('Unsupported file type. Please upload a CSV or image file.');
        setIsProcessing(false);
        return;
      }

      if (transactions.length === 0) {
        setError('No transactions found in the file');
        setIsProcessing(false);
        return;
      }

      // Check for duplicates and auto-categorize
      const processedTransactions = await processTransactions(transactions);

      onFileUploaded(processedTransactions, file.name);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMappingConfirm = async (
    mapping: ColumnMapping,
    saveTemplate: boolean,
    templateName?: string
  ) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Parse CSV with the provided mapping
      const transactions = await parseCSVWithMapping(csvData, mapping, pendingFileName);

      if (transactions.length === 0) {
        setError('No transactions found in the file');
        setIsProcessing(false);
        return;
      }

      // Save template if requested
      if (saveTemplate && csvAnalysis) {
        try {
          const { saveTemplate: saveTemplateFn } = await import('@/lib/mapping-templates');
          await saveTemplateFn({
            userId: '', // Will be set by API
            templateName: templateName || undefined,
            fingerprint: csvAnalysis.fingerprint,
            columnCount: csvAnalysis.columns.length,
            mapping,
          });
        } catch (err) {
          console.warn('Failed to save template:', err);
          // Non-critical error, continue with import
        }
      }

      // Check for duplicates and auto-categorize
      const processedTransactions = await processTransactions(transactions);

      onFileUploaded(processedTransactions, pendingFileName);
      setShowMappingDialog(false);
    } catch (err) {
      console.error('Error processing file with mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.jpg,.jpeg,.png,.pdf,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div className="text-4xl">📄 📷</div>
            <div>
              <p className="text-lg font-medium">Upload CSV or Image</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a CSV file or screenshot/photo of transactions
              </p>
            </div>
            <Button onClick={handleButtonClick} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Choose File'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
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

      {showMappingDialog && csvAnalysis && (
        <ColumnMappingDialog
          open={showMappingDialog}
          onOpenChange={setShowMappingDialog}
          analysis={csvAnalysis}
          sampleData={csvData.slice(0, 5)}
          onConfirm={handleMappingConfirm}
        />
      )}
    </>
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

/**
 * Parse CSV data with explicit column mapping
 */
async function parseCSVWithMapping(
  data: string[][],
  mapping: ColumnMapping,
  fileName: string
): Promise<ParsedTransaction[]> {
  const { extractMerchant, generateTransactionHash } = await import('@/lib/csv-parser-helpers');
  const { parseDate, normalizeDate } = await import('@/lib/date-parser');

  const startRow = mapping.hasHeaders ? 1 : 0;
  const transactions: ParsedTransaction[] = [];

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    try {
      // Extract values based on mapping
      const dateValue = mapping.dateColumn !== null ? row[mapping.dateColumn] : null;
      const descriptionValue = mapping.descriptionColumn !== null ? row[mapping.descriptionColumn] : null;
      
      let amount = 0;

      // Handle amount extraction
      if (mapping.amountColumn !== null) {
        amount = parseAmount(row[mapping.amountColumn]);
      } else if (mapping.debitColumn !== null && mapping.creditColumn !== null) {
        const debit = parseAmount(row[mapping.debitColumn] || '0');
        const credit = parseAmount(row[mapping.creditColumn] || '0');
        amount = debit || credit;
      } else if (mapping.debitColumn !== null) {
        amount = parseAmount(row[mapping.debitColumn]);
      } else if (mapping.creditColumn !== null) {
        amount = parseAmount(row[mapping.creditColumn]);
      }

      // Validate required fields
      if (!dateValue || !descriptionValue || !amount || isNaN(amount)) {
        continue;
      }

      // Parse date
      const dateResult = parseDate(dateValue, mapping.dateFormat || undefined);
      const date = dateResult.date ? normalizeDate(dateResult.date) : dateValue;

      const description = descriptionValue.trim();
      const merchant = extractMerchant(description);
      const originalData = JSON.stringify(row);
      const hash = generateTransactionHash(date, description, amount, originalData);

      transactions.push({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        description,
        merchant,
        amount: Math.abs(amount),
        originalData,
        hash,
        isDuplicate: false,
        status: 'pending',
        splits: [],
      });
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }

  return transactions;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  let cleaned = amountStr.trim();

  // Handle negative amounts in parentheses: (123.45)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[$,\s]/g, '');

  // Handle European format
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

async function processTransactions(transactions: ParsedTransaction[]): Promise<ParsedTransaction[]> {
  // Step 1: Check for duplicates within the file itself
  const seenHashes = new Map<string, number>();
  const withinFileDuplicates = new Set<number>();

  transactions.forEach((txn, index) => {
    if (seenHashes.has(txn.hash)) {
      withinFileDuplicates.add(index);
    } else {
      seenHashes.set(txn.hash, index);
    }
  });

  // Step 2: Fetch existing transaction hashes for deduplication against database
  const response = await fetch('/api/import/check-duplicates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hashes: transactions.map(t => t.hash),
    }),
  });

  const { duplicates } = await response.json();
  const databaseDuplicateSet = new Set(duplicates);

  // Step 3: Fetch categories for auto-categorization
  const categoriesResponse = await fetch('/api/categories');
  const categories = await categoriesResponse.json();

  // Step 4: Get smart category suggestions for all merchants
  const merchants = transactions.map(t => t.merchant);
  const categorizationResponse = await fetch('/api/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchants }),
  });
  const { suggestions } = await categorizationResponse.json();

  // Step 5: Process each transaction
  return transactions.map((transaction, index) => {
    const isDatabaseDuplicate = databaseDuplicateSet.has(transaction.hash);
    const isWithinFileDuplicate = withinFileDuplicates.has(index);
    const isDuplicate = isDatabaseDuplicate || isWithinFileDuplicate;

    const duplicateType = isDatabaseDuplicate
      ? 'database' as const
      : isWithinFileDuplicate
      ? 'within-file' as const
      : null;

    const suggestion = suggestions[index];
    const suggestedCategory = suggestion?.categoryId;
    const hasSplits = !!suggestedCategory;

    return {
      ...transaction,
      isDuplicate,
      duplicateType,
      status: isDuplicate || !hasSplits ? 'excluded' : 'pending',
      suggestedCategory,
      splits: suggestedCategory
        ? [{
            categoryId: suggestedCategory,
            categoryName: categories.find((c: any) => c.id === suggestedCategory)?.name || '',
            amount: transaction.amount,
          }]
        : [],
    };
  });
}
