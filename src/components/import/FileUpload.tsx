'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { parseCSVFile } from '@/lib/csv-parser';
import { parseImageFile } from '@/lib/image-parser';
import type { ParsedTransaction } from '@/lib/import-types';

interface FileUploadProps {
  onFileUploaded: (transactions: ParsedTransaction[], fileName: string) => void;
}

export default function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      let transactions: ParsedTransaction[];

      // Determine file type and use appropriate parser
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || fileType === 'text/csv') {
        transactions = await parseCSVFile(file);
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
        return;
      }

      if (transactions.length === 0) {
        setError('No transactions found in the file');
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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
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
          <li><strong>CSV Files:</strong> Chase, Citi, Wells Fargo, and more</li>
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

async function processTransactions(transactions: ParsedTransaction[]): Promise<ParsedTransaction[]> {
  // Fetch existing transaction hashes for deduplication
  const response = await fetch('/api/import/check-duplicates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hashes: transactions.map(t => t.hash),
    }),
  });

  const { duplicates } = await response.json();
  const duplicateSet = new Set(duplicates);

  // Fetch categories for auto-categorization
  const categoriesResponse = await fetch('/api/categories');
  const categories = await categoriesResponse.json();

  // Get smart category suggestions for all merchants
  const merchants = transactions.map(t => t.merchant);
  const categorizationResponse = await fetch('/api/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchants }),
  });
  const { suggestions } = await categorizationResponse.json();

  return transactions.map((transaction, index) => {
    const isDuplicate = duplicateSet.has(transaction.hash);
    const suggestion = suggestions[index];
    const suggestedCategory = suggestion?.categoryId;
    const hasSplits = !!suggestedCategory;

    return {
      ...transaction,
      isDuplicate,
      // Auto-exclude duplicates AND uncategorized transactions
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



