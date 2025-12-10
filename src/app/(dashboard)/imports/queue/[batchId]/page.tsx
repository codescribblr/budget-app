'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import TransactionPreview from '@/components/import/TransactionPreview';
import QueuedImportProcessingDialog from '@/components/import/QueuedImportProcessingDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Wallet, CreditCard, Clock, Trash2, RefreshCw, Search, Tag, MoreVertical } from 'lucide-react';
import type { ParsedTransaction } from '@/lib/import-types';
import { getIncompleteTasks } from '@/lib/processing-tasks';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [isRerunningDuplicates, setIsRerunningDuplicates] = useState(false);
  const [isRerunningCategorization, setIsRerunningCategorization] = useState(false);

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
    return () => {}; // Always return a cleanup function
  }, [transactions.length, loading]);

  // Define checkProcessingStatus before the useEffect that uses it
  // Use useCallback to memoize the function and prevent unnecessary re-renders
  const checkProcessingStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/import/queue/${encodeURIComponent(batchId)}/processing-status`);
      if (response.ok) {
        const data = await response.json();
        if (data.needsProcessing) {
          setShowProcessingDialog(true);
        }
      }
    } catch (error) {
      console.error('Error checking processing status:', error);
    }
  }, [batchId]);

  // Check processing status on mount (only if we don't have transactions yet)
  // This is a fallback - the main loading happens in loadProcessedTransactions
  // IMPORTANT: This hook must be called before any conditional returns
  useEffect(() => {
    if (!permissionsLoading && batchId && !loading && transactions.length === 0 && !showProcessingDialog) {
      // Only check if we haven't already started loading
      const timer = setTimeout(() => {
        checkProcessingStatus();
      }, 500); // Delay to avoid race conditions
      return () => clearTimeout(timer);
    }
    // Always return a cleanup function (no-op if condition wasn't met)
    return () => {};
  }, [permissionsLoading, batchId, loading, transactions.length, showProcessingDialog, checkProcessingStatus]);

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
          await loadFromStorage(storedTransactions, storedBatchInfo);
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

      // Debug: Log first import to see what fields are available
      if (queuedImports.length > 0) {
        const firstImport = queuedImports[0];
        console.log('First queued import fields:', {
          has_csv_data: !!firstImport.csv_data,
          has_csv_analysis: !!firstImport.csv_analysis,
          csv_file_name: firstImport.csv_file_name,
          csv_mapping_name: firstImport.csv_mapping_name,
          csv_mapping_template_id: firstImport.csv_mapping_template_id,
          source_batch_id: firstImport.source_batch_id,
          id: firstImport.id,
        });
        
        // If CSV fields are missing, try fetching them directly (workaround for PostgREST schema cache issues)
        if (!firstImport.csv_data && !firstImport.csv_file_name) {
          console.log('CSV fields missing from main query, fetching directly...');
          try {
            const csvResponse = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}&csvFields=true`);
            if (csvResponse.ok) {
              const csvData = await csvResponse.json();
              if (csvData.csvFields) {
                console.log('Fetched CSV fields directly:', csvData.csvFields);
                // Update the first import with CSV fields
                Object.assign(firstImport, csvData.csvFields);
              }
            }
          } catch (err) {
            console.warn('Failed to fetch CSV fields directly:', err);
          }
        }
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

        // Extract duplicate information from original_data
        let isDuplicate = false;
        let duplicateType: 'database' | 'within-file' | null = null;
        if (qi.original_data) {
          try {
            const originalData = typeof qi.original_data === 'string' 
              ? JSON.parse(qi.original_data) 
              : qi.original_data;
            isDuplicate = originalData.isDuplicate === true;
            duplicateType = originalData.duplicateType || null;
          } catch (err) {
            // If original_data is not valid JSON, ignore
            console.warn('Failed to parse original_data for duplicate info:', err);
          }
        }

        // Determine status: duplicates and uncategorized transactions should be excluded
        // Otherwise use database status
        const hasCategory = !!qi.suggested_category_id;
        let transactionStatus: 'pending' | 'confirmed' | 'excluded' = 'pending';
        if (isDuplicate || !hasCategory) {
          // Duplicates and uncategorized transactions are excluded
          transactionStatus = 'excluded';
        } else if (qi.status === 'reviewing' || qi.status === 'pending') {
          transactionStatus = 'pending';
        } else if (qi.status === 'approved') {
          transactionStatus = 'confirmed';
        } else if (qi.status === 'rejected') {
          transactionStatus = 'excluded';
        }

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
          status: transactionStatus,
          isDuplicate,
          duplicateType,
          originalData: typeof qi.original_data === 'string' ? qi.original_data : JSON.stringify(qi.original_data || {}),
          hash: qi.hash || '',
        };
      });

      // Check if processing is needed
      const firstImport = queuedImports[0];
      const tasks = (firstImport?.processing_tasks as any) || null;
      const incompleteTasks = tasks ? getIncompleteTasks(tasks) : [];
      const needsProcessing = incompleteTasks.length > 0;

      // Always load transactions - even if processing is needed, show them
      // The dialog will handle processing if needed
      const processedTransactions = initialTransactions;

      // If processing is needed and dialog isn't already shown, show it
      // But don't return early - we still want to load and display transactions
      if (needsProcessing && !showProcessingDialog) {
        setShowProcessingDialog(true);
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
        console.log('Setting CSV data state:', {
          csv_data: !!firstImport.csv_data,
          csv_analysis: !!firstImport.csv_analysis,
          csv_file_name: firstImport.csv_file_name,
          csv_mapping_name: firstImport.csv_mapping_name,
          csvDataExists,
        });
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

  const loadFromStorage = async (storedTransactions: string, storedBatchInfo: string | null) => {
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
      
      // Fetch CSV fields from database to ensure we have filename, mapping name, etc.
      // This is especially important after remap when data might have changed
      try {
        const csvResponse = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}&limit=1`);
        if (csvResponse.ok) {
          const csvData = await csvResponse.json();
          const firstImport = csvData.imports?.[0];
          
          if (firstImport) {
            // Set CSV-related fields
            const csvDataExists = !!firstImport.csv_data || !!firstImport.csv_analysis;
            setHasCsvData(csvDataExists);
            setMappingTemplateId(firstImport.csv_mapping_template_id || null);
            setImportFileName(firstImport.csv_file_name || null);
            
            // Get mapping name
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
          }
        }
      } catch (err) {
        console.warn('Failed to fetch CSV fields from database:', err);
        // Continue without CSV fields - they'll be missing but page will still work
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

  const handleProcessingComplete = () => {
    setShowProcessingDialog(false);
    // Reload transactions after processing with a small delay to ensure database updates are committed
    setTimeout(() => {
      loadProcessedTransactions();
    }, 300);
  };

  const handleRerunDuplicateCheck = async () => {
    if (!batchId || transactions.length === 0) return;
    
    setIsRerunningDuplicates(true);
    try {
      // Check for duplicates
      const response = await fetch('/api/import/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hashes: transactions.map(t => t.hash),
          transactions: transactions.map(t => ({
            hash: t.hash,
            date: t.date,
            description: t.description,
            amount: t.amount,
          })),
          batchId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check duplicates');
      }

      const { duplicates } = await response.json();
      const databaseDuplicateSet = new Set(duplicates);

      // Check for within-file duplicates
      const seenHashes = new Map<string, number>();
      const withinFileDuplicates = new Set<number>();
      transactions.forEach((txn, index) => {
        if (seenHashes.has(txn.hash)) {
          withinFileDuplicates.add(index);
        } else {
          seenHashes.set(txn.hash, index);
        }
      });

      // Update transactions with duplicate information
      const updatedTransactions = transactions.map((txn, index) => {
        const isDatabaseDuplicate = databaseDuplicateSet.has(txn.hash);
        const isWithinFileDuplicate = withinFileDuplicates.has(index);
        const isDuplicate = isDatabaseDuplicate || isWithinFileDuplicate;

        const duplicateType = isDatabaseDuplicate
          ? 'database' as const
          : isWithinFileDuplicate
          ? 'within-file' as const
          : null;

        const hasCategory = !!txn.suggestedCategory;
        const status = (isDuplicate || !hasCategory ? 'excluded' : 'pending') as 'pending' | 'confirmed' | 'excluded';

        // Update original_data with duplicate info
        let originalData: any = {};
        try {
          originalData = typeof txn.originalData === 'string' 
            ? JSON.parse(txn.originalData) 
            : txn.originalData || {};
        } catch (err) {
          originalData = {};
        }

        const updatedOriginalData = {
          ...originalData,
          isDuplicate,
          duplicateType,
        };

        return {
          ...txn,
          isDuplicate,
          duplicateType,
          status,
          originalData: JSON.stringify(updatedOriginalData),
        };
      });

      // Update database with duplicate information
      await fetch('/api/automatic-imports/queue/update-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: updatedTransactions }),
      });

      // Update state
      setTransactions(updatedTransactions);
      
      // Update duplicate counts
      const databaseDups = updatedTransactions.filter(t => t.duplicateType === 'database').length;
      const withinFileDups = updatedTransactions.filter(t => t.duplicateType === 'within-file').length;
      setDuplicateCounts({ database: databaseDups, withinFile: withinFileDups });

      toast.success('Duplicate check completed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to check duplicates');
    } finally {
      setIsRerunningDuplicates(false);
    }
  };

  const handleRerunCategorization = async () => {
    if (!batchId || transactions.length === 0) return;
    
    setIsRerunningCategorization(true);
    try {
      // Get category suggestions
      const merchants = transactions.map(t => t.merchant);
      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchants, batchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get category suggestions');
      }

      const { suggestions } = await response.json();

      // Fetch categories to get names
      const categoriesResponse = await fetch('/api/categories?excludeGoals=true');
      const categories = categoriesResponse.ok ? await categoriesResponse.json() : [];

      // Update transactions with categorization
      const updatedTransactions = transactions.map((txn, index) => {
        const suggestion = suggestions[index];
        const suggestedCategory = suggestion?.categoryId;
        const hasCategory = !!suggestedCategory;

        // Preserve duplicate status
        const isDuplicate = txn.isDuplicate || false;
        const duplicateType = txn.duplicateType || null;
        const status = (isDuplicate || !hasCategory ? 'excluded' : 'pending') as 'pending' | 'confirmed' | 'excluded';

        return {
          ...txn,
          suggestedCategory,
          splits: suggestedCategory
            ? [{
                categoryId: suggestedCategory,
                categoryName: categories.find((c: any) => c.id === suggestedCategory)?.name || '',
                amount: txn.amount,
              }]
            : [],
          status,
        };
      });

      // Update database with categorization
      await fetch('/api/automatic-imports/queue/update-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: updatedTransactions }),
      });

      // Update state
      setTransactions(updatedTransactions);

      toast.success('Categorization completed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to categorize transactions');
    } finally {
      setIsRerunningCategorization(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Dialog */}
      <QueuedImportProcessingDialog
        open={showProcessingDialog}
        progress={0}
        stage=""
        batchId={batchId}
        onComplete={handleProcessingComplete}
        onCancel={() => router.push('/imports/queue')}
      />

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
                  <Badge variant="outline" className="text-xs">
                    <span className="mr-1">File:</span>
                    <span className="font-medium">{importFileName}</span>
                  </Badge>
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
        {/* Desktop: Show individual buttons */}
        <div className="hidden md:flex items-center gap-2">
          {/* Re-map button - show for manual imports (CSV or PDF) with CSV data */}
          {hasCsvData && (batchInfo?.source_type === 'manual' || batchId.startsWith('manual-')) && (
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  // Include batchId in URL so page can be reloaded/bookmarked
                  router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(batchId)}`);
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
          {/* Re-check Duplicates button */}
          <Button 
            variant="outline" 
            onClick={handleRerunDuplicateCheck}
            disabled={isRerunningDuplicates || transactions.length === 0}
          >
            <Search className="h-4 w-4 mr-2" />
            {isRerunningDuplicates ? 'Checking...' : 'Re-check Duplicates'}
          </Button>
          {/* Re-run Categorization button */}
          <Button 
            variant="outline" 
            onClick={handleRerunCategorization}
            disabled={isRerunningCategorization || transactions.length === 0}
          >
            <Tag className="h-4 w-4 mr-2" />
            {isRerunningCategorization ? 'Categorizing...' : 'Re-run Categorization'}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {/* Mobile: Show delete button only */}
        <div className="md:hidden">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile: Re-run Actions Dropdown - shown above transaction preview */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full">
              <MoreVertical className="h-4 w-4 mr-2" />
              Re-run Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Re-map option - show for manual imports (CSV or PDF) with CSV data */}
            {hasCsvData && (batchInfo?.source_type === 'manual' || batchId.startsWith('manual-')) && (
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(batchId)}`);
                  } catch (err) {
                    console.error('Error initiating remap:', err);
                    toast.error('Failed to start re-mapping');
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-map Fields
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleRerunDuplicateCheck}
              disabled={isRerunningDuplicates || transactions.length === 0}
            >
              <Search className="h-4 w-4 mr-2" />
              {isRerunningDuplicates ? 'Checking...' : 'Re-check Duplicates'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleRerunCategorization}
              disabled={isRerunningCategorization || transactions.length === 0}
            >
              <Tag className="h-4 w-4 mr-2" />
              {isRerunningCategorization ? 'Categorizing...' : 'Re-run Categorization'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

