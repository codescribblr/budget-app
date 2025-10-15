'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { parseCSVFile } from '@/lib/csv-parser';
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
      const transactions = await parseCSVFile(file);
      
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
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium">Upload CSV File</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click the button below to select a CSV file from your computer
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
          <li>Citi Credit Cards (with rewards points)</li>
          <li>Chase Credit Cards</li>
          <li>Wells Fargo Checking</li>
          <li>Citi Bank Statements</li>
        </ul>
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

  return transactions.map(transaction => {
    const isDuplicate = duplicateSet.has(transaction.hash);
    const suggestedCategory = suggestCategory(transaction.merchant, categories);

    return {
      ...transaction,
      isDuplicate,
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

function suggestCategory(merchant: string, categories: any[]): number | undefined {
  const merchantLower = merchant.toLowerCase();

  // Simple keyword matching for common merchants
  const categoryMap: { [key: string]: string[] } = {
    'groceries': ['walmart', 'costco', 'aldi', 'food lion', 'harris teeter', 'publix', 'target'],
    'restaurants': ['mcdonald', 'burger king', 'chick-fil-a', 'taco bell', 'wendy', 'arby', 'pizza', 'chipotle', 'zaxby', 'tropical grille', 'texas roadhouse', 'domino', 'jack in the box', 'firehouse'],
    'gas': ['qt ', 'murphy', 'shell', 'exxon', 'bp ', 'chevron'],
    'entertainment': ['amazon', 'disney', 'netflix', 'hulu', 'spotify'],
    'auto': ['toyota', 'autozone', 'car wash', 'express wash'],
    'home': ['home depot', 'lowes', 'lowe\'s'],
  };

  for (const [categoryName, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => merchantLower.includes(keyword))) {
      const category = categories.find(c => c.name.toLowerCase().includes(categoryName));
      if (category) {
        return category.id;
      }
    }
  }

  return undefined;
}

