import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/import/queue/[batchId]/remap
 * Get CSV data and analysis for re-mapping a queued import batch
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;

    // Get first queued import from batch to extract CSV data
    const { data: queuedImport, error } = await supabase
      .from('queued_imports')
      .select('csv_data, csv_analysis, csv_file_name, csv_mapping_template_id, csv_fingerprint, csv_mapping_name')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .not('csv_data', 'is', null) // Only get one that has CSV data
      .limit(1)
      .single();

    if (error || !queuedImport) {
      return NextResponse.json(
        { error: 'Batch not found or CSV data not available' },
        { status: 404 }
      );
    }

    // Get template info if exists
    let currentTemplate = null;
    if (queuedImport.csv_mapping_template_id) {
      const { data: template } = await supabase
        .from('csv_import_templates')
        .select('id, template_name, date_column, amount_column, description_column, debit_column, credit_column, transaction_type_column, amount_sign_convention, date_format, has_headers, skip_rows')
        .eq('id', queuedImport.csv_mapping_template_id)
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
            amountSignConvention: template.amount_sign_convention || 'positive_is_expense',
            dateFormat: template.date_format,
            hasHeaders: template.has_headers,
            skipRows: template.skip_rows || 0,
          },
        };
      }
    }

    return NextResponse.json({
      csvData: queuedImport.csv_data,
      csvAnalysis: queuedImport.csv_analysis,
      csvFileName: queuedImport.csv_file_name || 'unknown.csv',
      currentMapping: currentTemplate?.mapping,
      currentTemplateId: currentTemplate?.id,
      currentTemplateName: currentTemplate?.name,
      currentMappingName: queuedImport.csv_mapping_name || null,
    });
  } catch (error: any) {
    console.error('Error fetching remap data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remap data', message: error.message },
      { status: 500 }
    );
  }
}
