'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from './FileUpload';
import TransactionPreview from './TransactionPreview';
import type { ParsedTransaction } from '@/lib/import-types';

export default function ImportTransactionsPage() {
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUploaded = (transactions: ParsedTransaction[], file: string) => {
    setParsedTransactions(transactions);
    setFileName(file);
  };

  const handleClearImport = () => {
    setParsedTransactions([]);
    setFileName('');
  };

  const handleImportComplete = () => {
    setParsedTransactions([]);
    setFileName('');
  };

  if (parsedTransactions.length > 0) {
    return (
      <div>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Preview: {fileName}</h2>
            <p className="text-sm text-muted-foreground">
              {parsedTransactions.length} transaction{parsedTransactions.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button variant="outline" onClick={handleClearImport}>
            Cancel Import
          </Button>
        </div>
        <TransactionPreview
          transactions={parsedTransactions}
          onImportComplete={handleImportComplete}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV or Image</CardTitle>
        <CardDescription>
          Upload a CSV file or screenshot/photo of transactions from your bank or credit card.
          Supports CSV files, screenshots, receipts, and statement images.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUpload onFileUploaded={handleFileUploaded} />
      </CardContent>
    </Card>
  );
}

