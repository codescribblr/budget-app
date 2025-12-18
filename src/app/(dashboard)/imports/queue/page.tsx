'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import QueuedImportProcessingDialog from '@/components/import/QueuedImportProcessingDialog';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, Clock, Trash2 } from 'lucide-react';
import type { ParsedTransaction } from '@/lib/import-types';
import { processTransactions } from '@/lib/csv-parser-helpers';
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

interface QueuedImportBatch {
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
  file_name?: string | null; // Filename for manual uploads
}

export default function QueueReviewPage() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const router = useRouter();
  const [batches, setBatches] = useState<QueuedImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<QueuedImportBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const fetchBatches = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
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
  };

  useEffect(() => {
    if (!permissionsLoading && !hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchBatches();
    }
  }, [permissionsLoading]);

  const handleReviewBatch = async (batchId: string, sourceType?: string) => {
    try {
      // For manual uploads, skip processing dialog and navigate directly
      // We can check sourceType if provided (from batch data), otherwise we need to fetch it
      if (sourceType === 'manual') {
        sessionStorage.setItem('queuedBatchId', batchId);
        // Navigate directly to preview - the batch review page will load from database
        window.location.href = `/imports/queue/${batchId}`;
        return;
      }

      // If sourceType wasn't provided, fetch it to check
      if (!sourceType) {
        const firstResponse = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}&limit=1`);
        if (!firstResponse.ok) {
          throw new Error('Failed to fetch batch transactions');
        }

        const firstData = await firstResponse.json();
        const firstImports = firstData.imports || [];
        
        if (firstImports.length === 0) {
          throw new Error('No transactions found for this batch');
        }

        // Check source_type to determine if we should skip processing
        try {
          const setupResponse = await fetch(`/api/automatic-imports/setups/${firstImports[0].import_setup_id}`);
          if (setupResponse.ok) {
            const setup = await setupResponse.json();
            if (setup.setup?.source_type === 'manual') {
              sessionStorage.setItem('queuedBatchId', batchId);
              window.location.href = `/imports/queue/${batchId}`;
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to fetch setup info:', err);
        }
      }

      // Show processing dialog - it will check status and process if needed
      setProcessingBatchId(batchId);
    } catch (error: any) {
      console.error('Error reviewing batch:', error);
      toast.error(error.message || 'Failed to review batch');
    }
  };

  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/automatic-imports/queue/batch/${batchToDelete.batch_id}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete batch');
      }

      toast.success(`Deleted ${batchToDelete.count} transaction${batchToDelete.count !== 1 ? 's' : ''} from queue`);
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
      fetchBatches(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting batch:', error);
      toast.error(error.message || 'Failed to delete batch');
    } finally {
      setIsDeleting(false);
    }
  };

  if (permissionsLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isEditor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Queue</CardTitle>
          <CardDescription>
            You don't have permission to review imports. Only editors and owners can review and approve imports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleProcessingComplete = () => {
    const batchId = processingBatchId;
    setProcessingBatchId(null);
    // Navigate to review page
    if (batchId) {
      window.location.href = `/imports/queue/${batchId}`;
    }
  };

  return (
    <div className="space-y-6">
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

      <div>
        <h1 className="text-3xl font-bold">Import Queue</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve transactions queued from automatic imports before they are added to your budget.
        </p>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Queued Imports</CardTitle>
            <CardDescription>
              When automatic imports fetch new transactions, they will appear here for review.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => (
            <Card key={batch.batch_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{batch.setup_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {batch.count} transaction{batch.count !== 1 ? 's' : ''} • {
                        batch.source_type === 'manual' ? 'Manual Upload' :
                        batch.source_type === 'email' ? 'Email Import' :
                        batch.source_type === 'teller' ? 'Teller' :
                        batch.source_type === 'plaid' ? 'Plaid' :
                        batch.source_type === 'yodlee' ? 'Yodlee' :
                        batch.source_type === 'finicity' ? 'Finicity' :
                        batch.source_type === 'mx' ? 'MX' :
                        batch.source_type
                      }
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
                  <div className="flex gap-2">
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
                    <Button onClick={() => handleReviewBatch(batch.batch_id, batch.source_type)}>
                      Review
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Date range: {new Date(batch.date_range.start).toLocaleDateString()} - {new Date(batch.date_range.end).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import Batch</AlertDialogTitle>
            <AlertDialogDescription>
              {batchToDelete?.source_type === 'manual' ? (
                <>
                  Are you sure you want to delete this manual import batch? This will permanently remove{' '}
                  {batchToDelete?.count} transaction{batchToDelete?.count !== 1 ? 's' : ''} from the queue.
                </>
              ) : (
                <>
                  Are you sure you want to delete this import batch from {batchToDelete?.setup_name}? 
                  This will remove {batchToDelete?.count} transaction{batchToDelete?.count !== 1 ? 's' : ''} from the queue.
                  <br /><br />
                  <strong>Important:</strong> These transactions will not be automatically re-imported from{' '}
                  {batchToDelete?.source_type === 'teller' ? 'Teller' :
                   batchToDelete?.source_type === 'email' ? 'Email Import' :
                   batchToDelete?.source_type === 'plaid' ? 'Plaid' :
                   batchToDelete?.source_type === 'yodlee' ? 'Yodlee' :
                   batchToDelete?.source_type === 'finicity' ? 'Finicity' :
                   batchToDelete?.source_type === 'mx' ? 'MX' :
                   'the integration'} on future syncs. If you want to import them again, you will need to manually upload them or create the transactions manually.
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
    </div>
  );
}
