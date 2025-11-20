'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { parseCSVFile } from '@/lib/csv-parser';
import { parseImageFile } from '@/lib/image-parser';
import { analyzeCSV } from '@/lib/column-analyzer';
import type { ParsedTransaction } from '@/lib/import-types';
import Papa from 'papaparse';

interface FileUploadProps {
  onFileUploaded: (transactions: ParsedTransaction[], fileName: string) => void;
}

export default function FileUpload({ onFileUploaded }: FileUploadProps) {
  const router = useRouter();
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
          // Navigate to mapping page
          sessionStorage.setItem('csvAnalysis', JSON.stringify(analysis));
          sessionStorage.setItem('csvData', JSON.stringify(rawData));
          sessionStorage.setItem('csvFileName', file.name);
          router.push('/import/map-columns');
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
      const { processTransactions } = await import('@/lib/csv-parser-helpers');
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

