'use client';
import { ContentLoading } from "@/components/new-look/page-skeleton";
import { freshFetch as fetch } from "@/lib/view-freshness";
import { usePathname, useRouter } from "next/navigation";
import { useResourceVersion } from "@/components/new-look/use-resource-version";
import { useImportPaths } from './use-import-paths';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { Wallet, CreditCard, Clock, Trash2, CalendarClock } from 'lucide-react';
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
import { parseLocalDate } from '@/lib/date-utils';
import BatchDuplicateStatus from './BatchDuplicateStatus';
import type { BatchDuplicateSummary } from '@/lib/import/batch-duplicates';

export interface QueuedImportBatch {
  batch_id: string;
  budget_id?: number;
  revisions?: Record<number,string>;
  import_setup_id: number;
  setup_name: string;
  source_type: string;
  count: number;
  duplicates?: BatchDuplicateSummary;
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
  const { importPath } = useImportPaths();
  const modern = usePathname().startsWith("/new");
  const resourceVersion = useResourceVersion("imports");
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [batches, setBatches] = useState<QueuedImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<QueuedImportBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const request = useRef<AbortController | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchBatches = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;

    try {
      const response = await fetch('/api/automatic-imports/queue?batches=true', {signal:controller.signal,cache:'no-store'});
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      if (controller.signal.aborted) return;
      setLoadError(false); setBatches(data.batches || []);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permissionsLoading) {
      fetchBatches();
    }
    return () => request.current?.abort();
  }, [permissionsLoading, fetchBatches, refreshKey, resourceVersion]);

  const handleReviewBatch = (batchId: string) => {
    sessionStorage.setItem('queuedBatchId', batchId);
    router.push(importPath(`/${encodeURIComponent(batchId)}`));
  };

  const handleDeleteBatch = async () => {
    if (!batchToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      if (modern && (!batchToDelete.budget_id || !batchToDelete.revisions || Object.keys(batchToDelete.revisions).length !== batchToDelete.count)) throw new Error("Reload the imports list before deleting safely.");
      const response = await fetch(
        `/api/automatic-imports/queue/batch/${encodeURIComponent(batchToDelete.batch_id)}/delete`,
        { method: 'DELETE', ...(modern ? { headers: {'Content-Type':'application/json'}, body: JSON.stringify({expectedBudgetId:batchToDelete.budget_id,expectedRevisions:batchToDelete.revisions}) } : {}) }
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

  const formatUploadedAt = (dateString: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (permissionsLoading || loading) {
    return (
      <ContentLoading label="Loading queued imports"><div className="flex justify-center py-8"><LoadingSpinner /></div></ContentLoading>
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
      {loadError && <div role="alert" className="nl-notice">Imports could not refresh. Previously loaded batches are retained. <button type="button" onClick={()=>void fetchBatches()}>Try again</button></div>}
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
            <Card key={batch.batch_id} className="nl-import-queue-card gap-3" data-duplicates-only={batch.duplicates?.all_duplicates || undefined}>
              <CardHeader className="pb-2">
                <div className="nl-batch-header flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 w-full">
                    <CardTitle className="text-base leading-snug break-words">{batch.setup_name}</CardTitle>
                    <CardDescription className="mt-1 break-words [overflow-wrap:anywhere]">
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
                        <Badge variant="outline" className="text-xs text-amber-600 theme-text-warning dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Historical
                        </Badge>
                      )}
                      {batch.is_historical === 'mixed' && (
                        <Badge variant="outline" className="text-xs text-amber-600 theme-text-warning dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Mixed (Historical)
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3"><BatchDuplicateStatus summary={batch.duplicates} count={batch.count} /></div>
                  </div>
                  <div className="nl-batch-actions flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size={batch.duplicates?.all_duplicates ? "sm" : "icon"}
                      className={batch.duplicates?.all_duplicates ? "nl-batch-delete" : undefined}
                      aria-label={`Delete import batch ${batch.file_name || batch.setup_name || ''}`.trim()}
                      onClick={() => {
                        setBatchToDelete(batch);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {batch.duplicates?.all_duplicates && "Delete batch"}
                    </Button>
                    <Button size="sm" variant={batch.duplicates?.all_duplicates ? "ghost" : "default"} onClick={() => handleReviewBatch(batch.batch_id)}>
                      Review
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {batch.created_at && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Uploaded {formatUploadedAt(batch.created_at)}
                    </span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Transactions: {parseLocalDate(batch.date_range.start)?.toLocaleDateString() ?? '—'} –{' '}
                  {parseLocalDate(batch.date_range.end)?.toLocaleDateString() ?? '—'}
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
              {batchToDelete?.duplicates?.all_duplicates && <><strong>All {batchToDelete.count} transactions in this batch are flagged as duplicates.</strong><br /><br /></>}
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
              <br /><br />
              Transactions already saved in your budget will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteBatch}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
