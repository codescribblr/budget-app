'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import TransactionPreview from '@/components/import/TransactionPreview';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Wallet, CreditCard, Clock, Trash2, RefreshCw } from 'lucide-react';
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

export default function BatchReviewPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [batchInfo, setBatchInfo] = useState<{
    setup_name: string;
    source_type: string;
    target_account_name: string | null;
    is_credit_card: boolean;
    is_historical: boolean | 'mixed';
  } | null>(null);
  const [hasCsvData, setHasCsvData] = useState<boolean>(false);
  const [mappingName, setMappingName] = useState<string | null>(null);
  const [mappingTemplateId, setMappingTemplateId] = useState<number | null>(null);
  const [mappingTemplateName, setMappingTemplateName] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [duplicateCounts, setDuplicateCounts] = useState<{
    database: number;
    withinFile: number;
  }>({ database: 0, withinFile: 0 });
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && batchId) {
      // Store batchId in sessionStorage so TransactionPreview can use it
      sessionStorage.setItem('queuedBatchId', batchId);
      
      // Small delay to ensure sessionStorage is available after navigation
      // This handles cases where Next.js RSC requests might cause timing issues
      const timer = setTimeout(() => {
        loadProcessedTransactions();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        // Don't clean up sessionStorage here - let it persist until after load
        // The cleanup happens after successful load, not on unmount
      };
    }
  }, [permissionsLoading, batchId]);

  // Cleanup sessionStorage after component mounts and data is loaded
  useEffect(() => {
    if (transactions.length > 0 && !loading) {
      // Data loaded successfully, clean up sessionStorage after a delay
      // This ensures the data is fully loaded before cleanup
      const timer = setTimeout(() => {
        sessionStorage.removeItem('queuedProcessedTransactions');
        sessionStorage.removeItem('queuedBatchInfo');
      }, 2000); // Longer delay to ensure everything is stable
      
      return () => clearTimeout(timer);
    }
  }, [transactions.length, loading]);

  const loadProcessedTransactions = async () => {
    // Retry logic to handle RSC timing issues
    const attemptLoad = async (attempt: number = 0) => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from sessionStorage (set by queue list page for automatic imports)
        const storedTransactions = sessionStorage.getItem('queuedProcessedTransactions');
        const storedBatchInfo = sessionStorage.getItem('queuedBatchInfo');
        
        if (storedTransactions) {
          loadFromStorage(storedTransactions, storedBatchInfo);
          return;
        }
        
        // If not in sessionStorage, retry a few times (handles RSC timing)
        if (attempt < 3) {
          setTimeout(() => {
            attemptLoad(attempt + 1);
          }, 200 * (attempt + 1)); // 200ms, 400ms, 600ms
          return;
        }
        
        // Still not found after retries - fetch from database (for manual uploads or direct navigation)
        console.log('Not found in sessionStorage, fetching from database...');
        await loadFromDatabase();
      } catch (err: any) {
        console.error('Error loading processed transactions:', err);
        setError(err.message || 'Failed to load batch transactions');
        setLoading(false);
      }
    };

    attemptLoad();
  };

  const loadFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch queued imports for this batch
      const response = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch transactions');
      }

      const data = await response.json();
      const queuedImports = data.imports || [];

      if (queuedImports.length === 0) {
        setError('No transactions found for this batch');
        setLoading(false);
        return;
      }

      // Fetch setup info to determine if this is a manual upload
      let isManualUpload = false;
      let setupInfo: any = null;
      if (queuedImports.length > 0) {
        try {
          const setupResponse = await fetch(`/api/automatic-imports/setups/${queuedImports[0].import_setup_id}`);
          if (setupResponse.ok) {
            const setup = await setupResponse.json();
            setupInfo = setup.setup;
            isManualUpload = setup.setup?.source_type === 'manual';
          }
        } catch (err) {
          console.warn('Failed to fetch setup info:', err);
        }
      }

      // Fetch categories to populate category names in splits
      let categories: any[] = [];
      try {
        const categoriesResponse = await fetch('/api/categories?excludeGoals=true');
        if (categoriesResponse.ok) {
          categories = await categoriesResponse.json();
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      }

      // Convert queued imports to ParsedTransaction format
      const initialTransactions: ParsedTransaction[] = queuedImports.map((qi: any) => {
        const category = qi.suggested_category_id 
          ? categories.find((c: any) => c.id === qi.suggested_category_id)
          : null;

        return {
          id: `queued-${qi.id}`,
          date: qi.transaction_date,
          description: qi.description,
          amount: qi.amount,
          transaction_type: qi.transaction_type,
          merchant: qi.merchant,
          suggestedCategory: qi.suggested_category_id || undefined,
          account_id: qi.target_account_id || undefined,
          credit_card_id: qi.target_credit_card_id || undefined,
          is_historical: qi.is_historical || false,
          splits: qi.suggested_category_id ? [{
            categoryId: qi.suggested_category_id,
            categoryName: category?.name || '',
            amount: qi.amount,
          }] : [],
          status: 'pending' as const,
          isDuplicate: false, // Duplicates are filtered out before saving to queue
          originalData: qi.original_data,
          hash: qi.hash || '',
        };
      });

      // For manual uploads, transactions are already processed during upload
      // Skip processing to avoid duplicate deduplication and categorization
      let processedTransactions: ParsedTransaction[];
      if (isManualUpload) {
        // Manual uploads are already processed - use as-is
        processedTransactions = initialTransactions;
      } else {
        // Automatic imports need processing (from queue list "Review" button)
        processedTransactions = await processTransactions(
          initialTransactions,
          initialTransactions[0]?.account_id || undefined,
          initialTransactions[0]?.credit_card_id || undefined,
          true, // Skip AI categorization initially
          undefined // No progress callback needed here
        );
      }

      // Fetch setup info for batch info (reuse the fetch we did earlier)
      let batchInfo = {
        setup_name: 'Unknown',
        source_type: 'unknown',
        target_account_name: null as string | null,
        is_credit_card: false,
        is_historical: false as boolean | 'mixed',
      };

      if (queuedImports.length > 0) {
        const firstImport = queuedImports[0];
        batchInfo.is_credit_card = !!firstImport.target_credit_card_id;
        const allHistorical = queuedImports.every((qi: any) => qi.is_historical === true);
        const someHistorical = queuedImports.some((qi: any) => qi.is_historical === true);
        batchInfo.is_historical = allHistorical ? true : someHistorical ? 'mixed' : false;

        // Check if CSV data exists (for re-mapping capability)
        // CSV data is stored on the first transaction of the batch
        // Also check csv_analysis as indicator that CSV data should be available
        const csvDataExists = !!firstImport.csv_data || !!firstImport.csv_analysis;
        setHasCsvData(csvDataExists);
        setMappingTemplateId(firstImport.csv_mapping_template_id || null);
        setImportFileName(firstImport.csv_file_name || null);
        
        // Get mapping name - use stored value or generate from analysis if available
        let mappingNameValue = firstImport.csv_mapping_name || null;
        
        // If no mapping name stored but we have CSV analysis, generate one
        if (!mappingNameValue && firstImport.csv_analysis) {
          try {
            const { generateAutomaticMappingName } = await import('@/lib/mapping-name-generator');
            const analysis = firstImport.csv_analysis;
            const fileName = firstImport.csv_file_name || 'unknown.csv';
            mappingNameValue = generateAutomaticMappingName(analysis, fileName);
          } catch (err) {
            console.warn('Failed to generate mapping name:', err);
          }
        }
        
        // Fallback to "Automatic Mapping" if still no name
        if (!mappingNameValue) {
          mappingNameValue = firstImport.csv_mapping_template_id ? 'Template Mapping' : 'Automatic Mapping';
        }
        
        setMappingName(mappingNameValue);
        
        // Fetch template name if template ID exists
        if (firstImport.csv_mapping_template_id) {
          try {
            const templateResponse = await fetch(`/api/import/templates/${firstImport.csv_mapping_template_id}`);
            if (templateResponse.ok) {
              const template = await templateResponse.json();
              setMappingTemplateName(template.template_name || null);
            }
          } catch (err) {
            console.warn('Failed to fetch template name:', err);
          }
        }

        // Use setup info we already fetched
        if (setupInfo) {
          batchInfo.setup_name = setupInfo.integration_name || 'Unknown';
          batchInfo.source_type = setupInfo.source_type || 'unknown';
        }
        
        // Fetch account/credit card name if mapped
        try {
          if (firstImport.target_account_id) {
            const accountResponse = await fetch(`/api/accounts/${firstImport.target_account_id}`);
            if (accountResponse.ok) {
              const account = await accountResponse.json();
              batchInfo.target_account_name = account.name;
            }
          } else if (firstImport.target_credit_card_id) {
            const cardResponse = await fetch(`/api/credit-cards/${firstImport.target_credit_card_id}`);
            if (cardResponse.ok) {
              const card = await cardResponse.json();
              batchInfo.target_account_name = card.name;
            }
          }
        } catch (err) {
          console.warn('Failed to fetch account/card name:', err);
        }
      }

      // Sort transactions by date descending (newest first)
      const sortedTransactions = [...processedTransactions].sort((a, b) => {
        // Compare dates (YYYY-MM-DD format sorts correctly as strings)
        const dateComparison = b.date.localeCompare(a.date);
        // If same date, maintain original order (by ID if available)
        if (dateComparison === 0) {
          // Try to extract numeric ID from string ID (format: "queued-123")
          const idA = typeof a.id === 'string' && a.id.startsWith('queued-') 
            ? parseInt(a.id.replace('queued-', '')) || 0 
            : 0;
          const idB = typeof b.id === 'string' && b.id.startsWith('queued-')
            ? parseInt(b.id.replace('queued-', '')) || 0
            : 0;
          return idB - idA; // Descending by ID as tiebreaker
        }
        return dateComparison;
      });

      setTransactions(sortedTransactions);
      setBatchInfo(batchInfo);
      
      // Calculate duplicate counts from processed transactions
      const databaseDups = sortedTransactions.filter(t => t.isDuplicate && t.duplicateType === 'database').length;
      const withinFileDups = sortedTransactions.filter(t => t.isDuplicate && t.duplicateType === 'within-file').length;
      setDuplicateCounts({ database: databaseDups, withinFile: withinFileDups });
      
      // Ensure mapping info is set even if not in first import (for old imports)
      if (queuedImports.length > 0 && !mappingName) {
        const firstImport = queuedImports[0];
        let mappingNameValue = firstImport.csv_mapping_name || null;
        
        // If no mapping name stored but we have CSV analysis, generate one
        if (!mappingNameValue && firstImport.csv_analysis) {
          try {
            const { generateAutomaticMappingName } = await import('@/lib/mapping-name-generator');
            const analysis = firstImport.csv_analysis;
            const fileName = firstImport.csv_file_name || 'unknown.csv';
            mappingNameValue = generateAutomaticMappingName(analysis, fileName);
          } catch (err) {
            console.warn('Failed to generate mapping name:', err);
          }
        }
        
        // Fallback to "Automatic Mapping" if still no name
        if (!mappingNameValue) {
          mappingNameValue = firstImport.csv_mapping_template_id ? 'Template Mapping' : 'Automatic Mapping';
        }
        
        if (mappingNameValue) {
          setMappingName(mappingNameValue);
        }
        
        if (!importFileName && firstImport.csv_file_name) {
          setImportFileName(firstImport.csv_file_name);
        }
        
        // Also ensure hasCsvData is set if csv_data or csv_analysis exists
        if (!hasCsvData && (firstImport.csv_data || firstImport.csv_analysis)) {
          setHasCsvData(true);
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading from database:', err);
      setError(err.message || 'Failed to load batch transactions');
      setLoading(false);
    }
  };

  const loadFromStorage = (storedTransactions: string, storedBatchInfo: string | null) => {
    try {
      // Load processed transactions from sessionStorage
      const processedTransactions = JSON.parse(storedTransactions);
      
      // Load batch info if available, otherwise use defaults
      let batchInfo = {
        setup_name: 'Unknown',
        source_type: 'unknown',
        target_account_name: null as string | null,
        is_credit_card: false,
        is_historical: false as boolean | 'mixed',
      };
      
      if (storedBatchInfo) {
        try {
          batchInfo = JSON.parse(storedBatchInfo);
        } catch (err) {
          console.warn('Failed to parse batch info:', err);
          // Use defaults
        }
      }
      
      // Sort transactions by date descending (newest first)
      const sortedTransactions = [...processedTransactions].sort((a, b) => {
        // Compare dates (YYYY-MM-DD format sorts correctly as strings)
        const dateComparison = b.date.localeCompare(a.date);
        // If same date, maintain original order (by ID if available)
        if (dateComparison === 0) {
          // Try to extract numeric ID from string ID (format: "queued-123")
          const idA = typeof a.id === 'string' && a.id.startsWith('queued-') 
            ? parseInt(a.id.replace('queued-', '')) || 0 
            : 0;
          const idB = typeof b.id === 'string' && b.id.startsWith('queued-')
            ? parseInt(b.id.replace('queued-', '')) || 0
            : 0;
          return idB - idA; // Descending by ID as tiebreaker
        }
        return dateComparison;
      });
      
      setTransactions(sortedTransactions);
      setBatchInfo(batchInfo);
      setLoading(false);
    } catch (err: any) {
      console.error('Error parsing stored data:', err);
      setError('Failed to parse stored transactions. Please try reviewing the batch again.');
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    // Navigate back to queue list after import completes
    // TransactionPreview will handle the import using the approve-batch endpoint
    // (it detects queued imports by the 'queued-' prefix in transaction IDs and batchId from sessionStorage)
    router.push('/imports/queue');
  };

  const handleDeleteBatch = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/automatic-imports/queue/batch/${batchId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete batch');
      }

      toast.success(`Deleted ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} from queue`);
      setDeleteDialogOpen(false);
      router.push('/imports/queue'); // Navigate back to queue list
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
          <CardTitle>Review Import Batch</CardTitle>
          <CardDescription>
            You don't have permission to review imports. Only editors and owners can review and approve imports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/imports/queue')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Review Import Batch</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/imports/queue')}>Back to Queue</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/imports/queue')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Review Import Batch</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Transactions</CardTitle>
            <CardDescription>No transactions found in this batch.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/imports/queue')}>Back to Queue</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/imports/queue')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Review Import Batch</h1>
          {batchInfo && (
            <div className="mt-2 space-y-2">
              <p className="text-muted-foreground">
                {batchInfo.setup_name} • {batchInfo.source_type}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {batchInfo.target_account_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    {batchInfo.is_credit_card ? (
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{batchInfo.target_account_name}</span>
                  </div>
                )}
                {/* Import File Name */}
                {importFileName && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">File:</span>
                    <span className="font-medium">{importFileName}</span>
                  </div>
                )}
                
                {/* Mapping Method and Name - Always show if we have any mapping info */}
                {(mappingName || importFileName || mappingTemplateId !== null) && (
                  <Badge variant="outline" className="text-xs">
                    <span className="mr-1">Mapping:</span>
                    <span className="font-medium">
                      {mappingTemplateId ? 'Template' : 'Automatic'} - {mappingName || 'Unknown'}
                    </span>
                    {mappingTemplateName && mappingTemplateId && (
                      <span className="ml-1 text-muted-foreground">({mappingTemplateName})</span>
                    )}
                  </Badge>
                )}
                
                {/* Duplicates */}
                {(duplicateCounts.database > 0 || duplicateCounts.withinFile > 0) && (
                  <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                    <span className="mr-1">Duplicates:</span>
                    <span className="font-medium">
                      {duplicateCounts.database > 0 && `${duplicateCounts.database} existing`}
                      {duplicateCounts.database > 0 && duplicateCounts.withinFile > 0 && ', '}
                      {duplicateCounts.withinFile > 0 && `${duplicateCounts.withinFile} within file`}
                    </span>
                  </Badge>
                )}
                {duplicateCounts.database === 0 && duplicateCounts.withinFile === 0 && (
                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                    <span className="mr-1">Duplicates:</span>
                    <span className="font-medium">None</span>
                  </Badge>
                )}
                {batchInfo.is_historical === true && (
                  <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3 mr-1" />
                    Historical
                  </Badge>
                )}
                {batchInfo.is_historical === 'mixed' && (
                  <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3 mr-1" />
                    Mixed (Historical)
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Re-map button - show for manual imports (CSV or PDF) with CSV data */}
          {/* Check both batchInfo.source_type and batchId pattern for manual imports */}
          {/* Also check if we have csv_analysis as fallback (for PDFs converted to CSV) */}
          {((hasCsvData || importFileName) && (batchInfo?.source_type === 'manual' || batchId.startsWith('manual-'))) && (
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  // Store batch ID for remap flow
                  sessionStorage.setItem('remapBatchId', batchId);
                  router.push('/import/map-columns?remap=true');
                } catch (err) {
                  console.error('Error initiating remap:', err);
                  toast.error('Failed to start re-mapping');
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-map Fields
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {transactions.length > 0 && (
        <TransactionPreview 
          transactions={transactions} 
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import Batch</AlertDialogTitle>
            <AlertDialogDescription>
              {batchInfo?.source_type === 'manual' ? (
                <>
                  Are you sure you want to delete this manual import batch? This will permanently remove{' '}
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} from the queue.
                </>
              ) : (
                <>
                  Are you sure you want to delete this import batch from {batchInfo?.setup_name}? 
                  This will remove {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} from the queue.
                  <br /><br />
                  <strong>Important:</strong> These transactions will not be automatically re-imported from{' '}
                  {batchInfo?.source_type === 'teller' ? 'Teller' :
                   batchInfo?.source_type === 'email' ? 'Email Import' :
                   batchInfo?.source_type === 'plaid' ? 'Plaid' :
                   batchInfo?.source_type === 'yodlee' ? 'Yodlee' :
                   batchInfo?.source_type === 'finicity' ? 'Finicity' :
                   batchInfo?.source_type === 'mx' ? 'MX' :
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

