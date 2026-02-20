import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { convertApiTransactionsToVirtualCSV } from '@/lib/automatic-imports/api-to-csv-converter';
import { analyzeCSV } from '@/lib/column-analyzer';

/**
 * GET /api/import/queue/[batchId]/remap
 * Get CSV data and analysis for re-mapping a queued import batch
 * Supports both CSV-based imports and API-based imports (Teller, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;

    // Get all queued imports from batch to check for CSV data or API data
    const { data: queuedImports, error: fetchError } = await supabase
      .from('queued_imports')
      .select('csv_data, csv_analysis, csv_file_name, csv_mapping_template_id, csv_fingerprint, csv_mapping_name, original_data, transaction_date, description, amount, import_setup_id, target_account_id, target_credit_card_id')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .limit(100); // Get enough to check for CSV data

    if (fetchError || !queuedImports || queuedImports.length === 0) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Find first import with CSV data, or use first import if none have CSV data
    const queuedImportWithCsv = queuedImports.find(qi => qi.csv_data);
    const firstImport = queuedImports[0];
    
    let csvData: string[][] | null = null;
    let csvAnalysis: any = null;
    let csvFileName: string = 'unknown.csv';
    let csvMappingTemplateId: number | null = null;
    let csvFingerprint: string | null = null;
    let csvMappingName: string | null = null;

    // Check if this is a CSV-based import (has CSV data)
    if (queuedImportWithCsv?.csv_data) {
      // CSV-based import - use existing CSV data
      csvData = queuedImportWithCsv.csv_data as string[][];
      csvAnalysis = queuedImportWithCsv.csv_analysis;
      csvFileName = queuedImportWithCsv.csv_file_name || 'unknown.csv';
      csvMappingTemplateId = queuedImportWithCsv.csv_mapping_template_id;
      csvFingerprint = queuedImportWithCsv.csv_fingerprint;
      csvMappingName = queuedImportWithCsv.csv_mapping_name;
    } else if (firstImport?.original_data) {
      // API-based import - convert to virtual CSV
      // Get import setup to determine source type
      const { data: importSetup } = await supabase
        .from('automatic_import_setups')
        .select('source_type, csv_mapping_template_id')
        .eq('id', firstImport.import_setup_id)
        .single();
      
      const sourceType = importSetup?.source_type || 'unknown';
      
      // Convert API transactions to virtual CSV
      const apiTransactions = queuedImports.map(qi => ({
        transaction_date: qi.transaction_date,
        description: qi.description,
        amount: qi.amount,
        original_data: qi.original_data,
      }));
      
      const virtualCSV = convertApiTransactionsToVirtualCSV(apiTransactions, sourceType);
      csvData = virtualCSV.csvData;
      csvAnalysis = analyzeCSV(csvData);
      csvFileName = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Account Transactions`;
      csvMappingTemplateId = importSetup?.csv_mapping_template_id || null;
      csvFingerprint = virtualCSV.fingerprint;
      
      // Try to get template name if template exists
      if (csvMappingTemplateId) {
        const { data: template } = await supabase
          .from('csv_import_templates')
          .select('template_name')
          .eq('id', csvMappingTemplateId)
          .single();
        csvMappingName = template?.template_name || null;
      }
    } else {
      // No CSV data and no original_data - can't remap
      return NextResponse.json(
        { error: 'Batch does not have CSV data or API transaction data available for remapping' },
        { status: 404 }
      );
    }

    // Get template info if exists
    let currentTemplate = null;
    if (csvMappingTemplateId) {
      const { data: template } = await supabase
        .from('csv_import_templates')
        .select('id, template_name, date_column, amount_column, description_column, debit_column, credit_column, transaction_type_column, status_column, amount_sign_convention, date_format, has_headers, skip_rows')
        .eq('id', csvMappingTemplateId)
        .eq('user_id', user.id)
        .single();

      if (template) {
        currentTemplate = {
          id: template.id,
          name: template.template_name,
          mapping: {
            dateColumn: template.date_column,
            amountColumn: template.amount_column,
            descriptionColumn: template.description_column,
            debitColumn: template.debit_column,
            creditColumn: template.credit_column,
            transactionTypeColumn: template.transaction_type_column,
            statusColumn: template.status_column,
            amountSignConvention: template.amount_sign_convention || 'positive_is_expense',
            dateFormat: template.date_format,
            hasHeaders: template.has_headers,
            skipRows: template.skip_rows || 0,
          },
        };
      }
    }

    return NextResponse.json({
      csvData,
      csvAnalysis,
      csvFileName,
      currentMapping: currentTemplate?.mapping,
      currentTemplateId: currentTemplate?.id,
      currentTemplateName: currentTemplate?.name,
      currentMappingName: csvMappingName,
      targetAccountId: firstImport?.target_account_id ?? null,
      targetCreditCardId: firstImport?.target_credit_card_id ?? null,
    });
  } catch (error: any) {
    console.error('Error fetching remap data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remap data', message: error.message },
      { status: 500 }
    );
  }
}

