import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';
import { getOrCreateManualImportSetup, queueTransactions } from '@/lib/automatic-imports/queue-manager';
import { parseCSVWithMapping } from '@/lib/csv-parser-helpers';
import { saveTemplate } from '@/lib/mapping-templates';
import type { ColumnMapping } from '@/lib/mapping-templates';
import type { ParsedTransaction } from '@/lib/import-types';
import { generateAutomaticMappingName } from '@/lib/mapping-name-generator';

/**
 * POST /api/import/queue/[batchId]/apply-remap
 * Apply re-mapping to a queued import batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;
    const body = await request.json();
    const {
      mapping,
      saveAsTemplate = false,
      templateName,
      overwriteTemplateId,
      deleteOldTemplate = false,
    } = body as {
      mapping: ColumnMapping;
      saveAsTemplate?: boolean;
      templateName?: string;
      overwriteTemplateId?: number;
      deleteOldTemplate?: boolean;
    };

    // Get CSV data and current template info, plus batch metadata
    const { data: queuedImport, error: fetchError } = await supabase
      .from('queued_imports')
      .select('csv_data, csv_analysis, csv_file_name, csv_mapping_template_id, csv_fingerprint, csv_mapping_name, import_setup_id, target_account_id, target_credit_card_id, is_historical')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .not('csv_data', 'is', null)
      .limit(1)
      .single();

    if (fetchError || !queuedImport || !queuedImport.csv_data) {
      return NextResponse.json(
        { error: 'Batch not found or CSV data not available' },
        { status: 404 }
      );
    }

    const csvData = queuedImport.csv_data as string[][];
    const csvAnalysis = queuedImport.csv_analysis as any;
    const csvFileName = queuedImport.csv_file_name || 'unknown.csv';
    const oldTemplateId = queuedImport.csv_mapping_template_id;

    // Parse CSV with new mapping
    const transactions = await parseCSVWithMapping(
      csvData,
      mapping,
      csvFileName
    );

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found with new mapping' },
        { status: 400 }
      );
    }

    // Handle template save/update
    let newTemplateId: number | undefined;
    let mappingName: string | undefined;
    
    if (saveAsTemplate) {
      if (overwriteTemplateId) {
        // Update existing template
        const { data: updated } = await supabase
          .from('csv_import_templates')
          .update({
            template_name: templateName || undefined,
            date_column: mapping.dateColumn,
            amount_column: mapping.amountColumn,
            description_column: mapping.descriptionColumn,
            debit_column: mapping.debitColumn,
            credit_column: mapping.creditColumn,
            transaction_type_column: mapping.transactionTypeColumn,
            amount_sign_convention: mapping.amountSignConvention || 'positive_is_expense',
            date_format: mapping.dateFormat,
            has_headers: mapping.hasHeaders,
            skip_rows: mapping.skipRows || 0,
            last_used: new Date().toISOString(),
          })
          .eq('id', overwriteTemplateId)
          .eq('user_id', user.id)
          .select('id, template_name')
          .single();

        if (updated) {
          newTemplateId = updated.id;
          mappingName = updated.template_name || templateName || 'Saved Template';
        }
      } else {
        // Create new template
        try {
          const savedTemplate = await saveTemplate({
            userId: user.id,
            templateName: templateName || undefined,
            fingerprint: csvAnalysis.fingerprint || queuedImport.csv_fingerprint || '',
            columnCount: csvData[0]?.length || 0,
            mapping,
          });
          newTemplateId = savedTemplate.id;
          mappingName = savedTemplate.template_name || templateName || 'Saved Template';
        } catch (err) {
          console.warn('Failed to save template:', err);
          // Non-critical error, continue
        }
      }

      // Delete old template if requested
      if (deleteOldTemplate && oldTemplateId && oldTemplateId !== newTemplateId) {
        await supabase
          .from('csv_import_templates')
          .delete()
          .eq('id', oldTemplateId)
          .eq('user_id', user.id);
      }
    }
    
    // If no template was saved, generate automatic mapping name
    if (!mappingName) {
      mappingName = generateAutomaticMappingName(csvAnalysis, csvFileName);
    }

    // Get or create manual import setup
    const importSetupId = await getOrCreateManualImportSetup(
      undefined,
      queuedImport.target_account_id || null,
      queuedImport.target_credit_card_id || null
    );

    // Apply batch metadata to transactions
    const transactionsWithMetadata = transactions.map(txn => ({
      ...txn,
      account_id: queuedImport.target_account_id || undefined,
      credit_card_id: queuedImport.target_credit_card_id || undefined,
      is_historical: queuedImport.is_historical || false,
    }));

    // Delete old queued imports for this batch BEFORE queueing new ones
    // This ensures queueTransactions doesn't see them as duplicates
    // First, get count of records to delete for logging
    const { count: countBeforeDelete } = await supabase
      .from('queued_imports')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId);
    
    console.log(`About to delete ${countBeforeDelete || 0} old queued imports for batch ${batchId}`);
    
    // Delete all queued imports for this batch
    // DELETE policy allows editors to delete queued imports for their accounts
    const { error: deleteError, data: deletedData } = await supabase
      .from('queued_imports')
      .delete()
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .select('id');

    if (deleteError) {
      console.error('Error deleting old queued imports:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete old queued imports', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted ${deletedData?.length || 0} old queued imports for batch ${batchId}`);

    // Verify deletion by checking count after delete
    const { count: countAfterDelete } = await supabase
      .from('queued_imports')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId);
    
    if (countAfterDelete && countAfterDelete > 0) {
      console.error(`ERROR: ${countAfterDelete} records still exist for batch ${batchId} after delete`);
      return NextResponse.json(
        { error: `Failed to delete all old queued imports. ${countAfterDelete} records still exist.` },
        { status: 500 }
      );
    }

    // Small delay to ensure delete is committed before queueing
    // This prevents race conditions where queueTransactions might still see old records
    await new Promise(resolve => setTimeout(resolve, 200));

    // Queue transactions with SAME batch ID (replacing the old ones)
    // Processing (deduplication, categorization) will happen on client side
    // Preserve is_historical from original batch
    // Pass supabase client to ensure we're using the same connection
    const queuedCount = await queueTransactions({
      supabase, // Use same supabase client to ensure consistency
      importSetupId,
      transactions: transactionsWithMetadata,
      sourceBatchId: batchId, // Reuse existing batchId
      isHistorical: queuedImport.is_historical || false,
      csvData,
      csvAnalysis,
      csvFingerprint: csvAnalysis.fingerprint || queuedImport.csv_fingerprint || undefined,
      csvMappingTemplateId: newTemplateId,
      csvFileName,
      csvMappingName: mappingName,
    });

    return NextResponse.json({
      success: true,
      batchId: batchId, // Return same batchId
      queuedCount,
      templateId: newTemplateId,
    });
  } catch (error: any) {
    console.error('Error applying remap:', error);
    return NextResponse.json(
      { error: 'Failed to apply remap', message: error.message },
      { status: 500 }
    );
  }
}
