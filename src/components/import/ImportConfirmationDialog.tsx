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

interface ImportConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  categorizedCount: number;
  uncategorizedCount: number;
  manuallyExcludedCount: number;
  databaseDuplicateCount: number;
  withinFileDuplicateCount: number;
}

export default function ImportConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  categorizedCount,
  uncategorizedCount,
  manuallyExcludedCount,
  databaseDuplicateCount,
  withinFileDuplicateCount,
}: ImportConfirmationDialogProps) {
  const duplicateCount = databaseDuplicateCount + withinFileDuplicateCount;
  const totalExcluded = uncategorizedCount + manuallyExcludedCount + duplicateCount;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Import</DialogTitle>
          <DialogDescription>
            Review the import summary before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <span className="font-medium text-green-900 dark:text-green-100">
                Transactions to Import
              </span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {categorizedCount}
              </span>
            </div>

            {totalExcluded > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Transactions to Exclude
                  </span>
                  <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {totalExcluded}
                  </span>
                </div>

                <div className="ml-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {uncategorizedCount > 0 && (
                    <div className="flex justify-between">
                      <span>• Uncategorized:</span>
                      <span className="font-medium">{uncategorizedCount}</span>
                    </div>
                  )}
                  {manuallyExcludedCount > 0 && (
                    <div className="flex justify-between">
                      <span>• Manually excluded:</span>
                      <span className="font-medium">{manuallyExcludedCount}</span>
                    </div>
                  )}
                  {databaseDuplicateCount > 0 && (
                    <div className="flex justify-between">
                      <span>• Duplicates (already imported):</span>
                      <span className="font-medium">{databaseDuplicateCount}</span>
                    </div>
                  )}
                  {withinFileDuplicateCount > 0 && (
                    <div className="flex justify-between">
                      <span>• Potential duplicates (within file):</span>
                      <span className="font-medium">{withinFileDuplicateCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {uncategorizedCount > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>Note:</strong> {uncategorizedCount} uncategorized transaction{uncategorizedCount !== 1 ? 's' : ''} will be excluded.
                You can categorize them later and import them in a future batch.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Go Back
          </Button>
          <Button onClick={onConfirm} disabled={categorizedCount === 0}>
            Import {categorizedCount} Transaction{categorizedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


