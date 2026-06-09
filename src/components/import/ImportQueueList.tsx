'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import QueuedImportProcessingDialog from '@/components/import/QueuedImportProcessingDialog';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { Wallet, CreditCard, Clock, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export interface QueuedImportBatch {
  batch_id: string;
  import_setup_id: number;
  setup_name: string;
  source_type: string;
  count: number;
  date_range: { start: string; end: string };
  created_at: string;
  status: string;
  target_account_name: string | null;
  target_account_id: number | null;
  is_credit_card: boolean;
  is_historical: boolean | 'mixed';
  file_name?: string | null;
}

interface ImportQueueListProps {
  refreshKey?: number;
}

export default function ImportQueueList({ refreshKey }: ImportQueueListProps) {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [batches, setBatches] = useState<QueuedImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<QueuedImportBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchingRef = useRef(false);

  const fetchBatches = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/automatic-imports/queue?batches=true');
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!permissionsLoading) {
      fetchBatches();
    }
  }, [permissionsLoading, fetchBatches, refreshKey]);

  const handleReviewBatch = async (batchId: string, sourceType?: string) => {
    try {
      if (sourceType === 'manual') {
        sessionStorage.setItem('queuedBatchId', batchId);
        window.location.href = `/imports/${batchId}`;
        return;
      }

      if (!sourceType) {
        const firstResponse = await fetch(
          `/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}&limit=1`
        );
        if (!firstResponse.ok) {
          throw new Error('Failed to fetch batch transactions');
        }

        const firstData = await firstResponse.json();
        const firstImports = firstData.imports || [];

        if (firstImports.length === 0) {
          throw new Error('No transactions found for this batch');
        }

        try {
          const setupResponse = await fetch(
            `/api/automatic-imports/setups/${firstImports[0].import_setup_id}`
          );
          if (setupResponse.ok) {
            const setup = await setupResponse.json();
            if (setup.setup?.source_type === 'manual') {
              sessionStorage.setItem('queuedBatchId', batchId);
              window.location.href = `/imports/${batchId}`;
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to fetch setup info:', err);
        }
      }

      setProcessingBatchId(batchId);
    } catch (error: unknown) {
      console.error('Error reviewing batch:', error);
      const message = error instanceof Error ? error.message : 'Failed to review batch';
      toast.error(message);
    }
  };

  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/automatic-imports/queue/batch/${batchToDelete.batch_id}/delete`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete batch');
      }

      toast.success(
        `Deleted ${batchToDelete.count} transaction${batchToDelete.count !== 1 ? 's' : ''} from queue`
      );
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
      fetchBatches();
    } catch (error: unknown) {
      console.error('Error deleting batch:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete batch';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcessingComplete = () => {
    const batchId = processingBatchId;
    setProcessingBatchId(null);
    if (batchId) {
      window.location.href = `/imports/${batchId}`;
    }
  };

  if (permissionsLoading || loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isEditor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queued imports</CardTitle>
          <CardDescription>
            You don&apos;t have permission to review imports. Only editors and owners can review and
            approve imports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {processingBatchId && (
        <QueuedImportProcessingDialog
          open={!!processingBatchId}
          progress={0}
          stage=""
          batchId={processingBatchId}
          onComplete={handleProcessingComplete}
          onCancel={() => setProcessingBatchId(null)}
        />
      )}

      {batches.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No queued imports</CardTitle>
            <CardDescription>
              Upload a file above or wait for automatic imports. New transactions will appear here
              for review.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {batches.map((batch) => (
            <Card key={batch.batch_id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{batch.setup_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {batch.count} transaction{batch.count !== 1 ? 's' : ''} •{' '}
                      {batch.source_type === 'manual'
                        ? 'Manual upload'
                        : batch.source_type === 'email'
                          ? 'Email import'
                          : batch.source_type === 'teller'
                            ? 'Teller'
                            : batch.source_type === 'plaid'
                              ? 'Plaid'
                              : batch.source_type === 'yodlee'
                                ? 'Yodlee'
                                : batch.source_type === 'finicity'
                                  ? 'Finicity'
                                  : batch.source_type === 'mx'
                                    ? 'MX'
                                    : batch.source_type}
                      {batch.source_type === 'manual' && batch.file_name && (
                        <> • <span className="font-medium">{batch.file_name}</span></>
                      )}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {batch.target_account_name && (
                        <div className="flex items-center gap-1.5 text-sm">
                          {batch.is_credit_card ? (
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{batch.target_account_name}</span>
                        </div>
                      )}
                      {batch.is_historical === true && (
                        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Historical
                        </Badge>
                      )}
                      {batch.is_historical === 'mixed' && (
                        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Mixed (Historical)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setBatchToDelete(batch);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleReviewBatch(batch.batch_id, batch.source_type)}>
                      Review
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  {new Date(batch.date_range.start).toLocaleDateString()} –{' '}
                  {new Date(batch.date_range.end).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete import batch</AlertDialogTitle>
            <AlertDialogDescription>
              {batchToDelete?.source_type === 'manual' ? (
                <>
                  Are you sure you want to delete this manual import batch? This will permanently
                  remove {batchToDelete?.count} transaction{batchToDelete?.count !== 1 ? 's' : ''}{' '}
                  from the queue.
                </>
              ) : (
                <>
                  Are you sure you want to delete this import batch from {batchToDelete?.setup_name}?
                  This will remove {batchToDelete?.count} transaction
                  {batchToDelete?.count !== 1 ? 's' : ''} from the queue.
                  <br /><br />
                  <strong>Important:</strong> These transactions will not be automatically
                  re-imported from{' '}
                  {batchToDelete?.source_type === 'teller'
                    ? 'Teller'
                    : batchToDelete?.source_type === 'email'
                      ? 'Email Import'
                      : batchToDelete?.source_type === 'plaid'
                        ? 'Plaid'
                        : batchToDelete?.source_type === 'yodlee'
                          ? 'Yodlee'
                          : batchToDelete?.source_type === 'finicity'
                            ? 'Finicity'
                            : batchToDelete?.source_type === 'mx'
                              ? 'MX'
                              : 'the integration'}{' '}
                  on future syncs.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
