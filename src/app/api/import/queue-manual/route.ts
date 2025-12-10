import { NextResponse } from 'next/server';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getOrCreateManualImportSetup, queueTransactions } from '@/lib/automatic-imports/queue-manager';
import { initializeProcessingTasks } from '@/lib/processing-tasks';
import type { ParsedTransaction } from '@/lib/import-types';

/**
 * POST /api/import/queue-manual
 * Save manually uploaded transactions to the import queue
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json();
    const { 
      transactions, 
      fileName, 
      targetAccountId, 
      targetCreditCardId,
      isHistorical = false,
      csvData,
      csvAnalysis,
      csvFingerprint,
      csvMappingTemplateId,
      csvMappingName,
    } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'transactions array is required' },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName is required' },
        { status: 400 }
      );
    }

    // Get or create manual import setup
    const importSetupId = await getOrCreateManualImportSetup(
      undefined,
      targetAccountId || null,
      targetCreditCardId || null
    );

    // Generate batch ID from filename and timestamp
    const batchId = `manual-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`;

    // Add filename to each transaction's originalData for manual uploads
    const transactionsWithFilename = transactions.map(txn => ({
      ...txn,
      originalData: txn.originalData 
        ? (typeof txn.originalData === 'string' 
            ? JSON.stringify({ ...JSON.parse(txn.originalData), _uploadFileName: fileName })
            : JSON.stringify({ ...txn.originalData, _uploadFileName: fileName }))
        : JSON.stringify({ _uploadFileName: fileName }),
    }));

    // Validate template ID exists if provided
    let validatedTemplateId: number | undefined = undefined;
    if (csvMappingTemplateId) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { getActiveAccountId } = await import('@/lib/account-context');
          const accountId = await getActiveAccountId();
          
          if (accountId) {
            // Check if template exists and belongs to user
            const { data: template, error: templateError } = await supabase
              .from('csv_import_templates')
              .select('id')
              .eq('id', csvMappingTemplateId)
              .eq('user_id', user.id)
              .single();
            
            if (!templateError && template) {
              validatedTemplateId = csvMappingTemplateId;
            } else {
              console.warn('Template ID provided but not found or not accessible:', csvMappingTemplateId);
            }
          }
        }
      } catch (err) {
        console.warn('Error validating template ID:', err);
        // Continue without template ID
      }
    }

    // Initialize processing tasks
    // For manual imports from mapping view, csv_mapping is already done
    // For other manual imports, check if CSV data exists
    const hasCsvData = !!csvData;
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    const processingTasks = initializeProcessingTasks('manual', hasCsvData, isPdf);

    // Debug logging
    console.log('queue-manual API received:', {
      fileName,
      transactionCount: transactionsWithFilename.length,
      hasCsvData,
      csvDataLength: csvData ? (Array.isArray(csvData) ? csvData.length : 'not array') : 0,
      hasCsvAnalysis: !!csvAnalysis,
      csvMappingName,
      csvMappingTemplateId,
      validatedTemplateId,
      processingTasks,
    });

    // Queue transactions
    // Note: isHistorical is applied per-transaction if provided in transaction.is_historical
    // Otherwise, the batch-level isHistorical is used
    const queuedCount = await queueTransactions({
      importSetupId,
      transactions: transactionsWithFilename as ParsedTransaction[],
      sourceBatchId: batchId,
      isHistorical,
      csvData,
      csvAnalysis,
      csvFingerprint,
      csvMappingTemplateId: validatedTemplateId, // Use validated template ID
      csvFileName: fileName,
      csvMappingName,
      processingTasks,
    });

    if (queuedCount === 0) {
      return NextResponse.json(
        { error: 'All transactions are duplicates or failed to queue' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      batchId,
      queuedCount,
      importSetupId,
    });
  } catch (error: any) {
    console.error('Error in POST /api/import/queue-manual:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to queue manual import' },
      { status: 500 }
    );
  }
}
