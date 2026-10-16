'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ImportProgressDialogProps {
  open: boolean;
  status: 'processing' | 'success' | 'error';
  message: string;
  onContinue: () => void;
  importedCount?: number;
  isHistorical?: boolean;
}

export default function ImportProgressDialog({
  open,
  status,
  message,
  onContinue,
  importedCount,
  isHistorical,
}: ImportProgressDialogProps) {
  const isProcessing = status === 'processing';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isProcessing && 'Importing Transactions...'}
            {isSuccess && 'Import Complete'}
            {isError && 'Import Failed'}
          </DialogTitle>
          <DialogDescription>
            {isProcessing && 'Please wait while we process your transactions'}
            {isSuccess && 'Your transactions have been successfully imported'}
            {isError && 'An error occurred during import'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Status Icon */}
            {isProcessing && (
              <Loader2 data-dialog-color="accent" className="h-16 w-16 text-blue-500 theme-text-accent animate-spin" />
            )}
            {isSuccess && (
              <CheckCircle2 data-dialog-color="accent" className="h-16 w-16 text-green-500 theme-text-accent" />
            )}
            {isError && (
              <XCircle data-dialog-color="negative" className="h-16 w-16 text-red-500 theme-text-danger" />
            )}

            {/* Status Message */}
            <div className="text-center space-y-2">
              {isProcessing && (
                <>
                  <p data-dialog-color="foreground" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Processing transactions...
                  </p>
                  <p data-dialog-color="muted" className="text-sm text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </>
              )}

              {isSuccess && importedCount !== undefined && importedCount > 0 && (
                <>
                  <p data-dialog-color="accent" className="text-lg font-medium text-green-900 theme-text-accent dark:text-green-100">
                    Successfully imported {importedCount} transaction{importedCount !== 1 ? 's' : ''}
                  </p>
                  {isHistorical && (
                    <p data-dialog-color="muted" className="text-sm text-gray-600 dark:text-gray-400">
                      These historical transactions will not affect your current envelope balances.
                    </p>
                  )}
                  <p data-dialog-color="muted" className="text-sm text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </>
              )}

              {isError && (
                <>
                  <p data-dialog-color="negative" className="text-lg font-medium text-red-900 theme-text-danger dark:text-red-100">
                    Failed to import transactions
                  </p>
                  <p data-dialog-color="muted" className="text-sm text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </>
              )}
            </div>

            {/* Progress Details */}
            {isProcessing && (
              <div className="w-full max-w-sm space-y-2 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span data-dialog-color="muted" className="text-gray-600 dark:text-gray-400">Step 1:</span>
                  <span data-dialog-color="foreground" className="text-gray-900 dark:text-gray-100">Importing transactions</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span data-dialog-color="muted" className="text-gray-600 dark:text-gray-400">Step 2:</span>
                  <span data-dialog-color="foreground" className="text-gray-900 dark:text-gray-100">Learning categories</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span data-dialog-color="muted" className="text-gray-600 dark:text-gray-400">Step 3:</span>
                  <span data-dialog-color="foreground" className="text-gray-900 dark:text-gray-100">Updating balances</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isProcessing && (
          <DialogFooter>
            <Button onClick={onContinue} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}


