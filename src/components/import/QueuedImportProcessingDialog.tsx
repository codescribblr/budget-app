'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface QueuedImportProcessingDialogProps {
  open: boolean;
  progress: number;
  stage: string;
}

export default function QueuedImportProcessingDialog({
  open,
  progress,
  stage,
}: QueuedImportProcessingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Processing Transactions</DialogTitle>
          <DialogDescription>
            Categorizing transactions and checking for duplicates...
          </DialogDescription>
        </DialogHeader>

        <div className="py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Loading Icon */}
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />

            {/* Progress Message */}
            <div className="text-center space-y-2 w-full">
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {stage || 'Processing transactions...'}
              </p>
              <div className="w-full max-w-sm mx-auto space-y-2 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="text-gray-900 dark:text-gray-100">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

