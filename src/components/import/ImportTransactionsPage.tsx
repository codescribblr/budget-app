'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from './FileUpload';
import TransactionPreview from './TransactionPreview';
import ImportQueueList from './ImportQueueList';
import type { ParsedTransaction } from '@/lib/import-types';
import { useAccountPermissions } from '@/hooks/use-account-permissions';

export default function ImportTransactionsPage() {
  const router = useRouter();
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  useEffect(() => {
    const storedTransactions = sessionStorage.getItem('parsedTransactions');
    const storedFileName = sessionStorage.getItem('parsedFileName');

    if (storedTransactions && storedFileName) {
      try {
        const transactions = JSON.parse(storedTransactions);
        setParsedTransactions(transactions);
        setFileName(storedFileName);
        sessionStorage.removeItem('parsedTransactions');
        sessionStorage.removeItem('parsedFileName');
      } catch (err) {
        console.error('Error loading parsed transactions:', err);
      }
    }
  }, []);

  const handleFileUploaded = (transactions: ParsedTransaction[], file: string) => {
    setParsedTransactions(transactions);
    setFileName(file);
  };

  const handleClearImport = () => {
    setParsedTransactions([]);
    setFileName('');
    sessionStorage.removeItem('parsedTransactions');
    sessionStorage.removeItem('parsedFileName');
    sessionStorage.removeItem('csvDateFormat');
    sessionStorage.removeItem('csvTemplateId');
    sessionStorage.removeItem('importIsHistorical');
  };

  const handleImportComplete = () => {
    setParsedTransactions([]);
    setFileName('');
    sessionStorage.removeItem('csvDateFormat');
    sessionStorage.removeItem('csvTemplateId');
    sessionStorage.removeItem('csvData');
    sessionStorage.removeItem('csvFileName');
    sessionStorage.removeItem('csvFingerprint');
    sessionStorage.removeItem('importIsHistorical');
    router.push('/transactions');
  };

  const handleBatchQueued = () => {
    setQueueRefreshKey((k) => k + 1);
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload transactions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!isEditor && !permissionsLoading ? (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You only have read access to this account. Only account owners and editors can import
                transactions.
              </p>
            </div>
          ) : (
            <FileUpload
              onFileUploaded={handleFileUploaded}
              disabled={!isEditor || permissionsLoading}
              compact
              onBatchQueued={handleBatchQueued}
            />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Queued imports</h2>
        <ImportQueueList refreshKey={queueRefreshKey} />
      </div>
    </div>
  );
}
