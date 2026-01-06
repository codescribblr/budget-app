import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { getOrCreateManualImportSetup, queueTransactions } from '@/lib/automatic-imports/queue-manager';
import { parseCSVWithMapping } from '@/lib/csv-parser-helpers';
import { resetTasksAfterRemap } from '@/lib/processing-tasks';
import type { ColumnMapping } from '@/lib/mapping-templates';
import type { ParsedTransaction } from '@/lib/import-types';
import { generateAutomaticMappingName } from '@/lib/mapping-name-generator';
import { convertTellerTransactionToParsed } from '@/lib/automatic-imports/providers/teller-service';
import type { TellerTransaction } from '@/lib/automatic-imports/providers/teller-service';

/**
 * POST /api/import/queue/[batchId]/apply-remap
 * Apply re-mapping to a queued import batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
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
      templateName: providedTemplateName,
      overwriteTemplateId,
      deleteOldTemplate = false,
    } = body as {
      mapping: ColumnMapping;
      saveAsTemplate?: boolean;
      templateName?: string;
      overwriteTemplateId?: number;
      deleteOldTemplate?: boolean;
    };
    
    let templateName = providedTemplateName;

    // Get all queued imports from batch to check if this is API-based or CSV-based
    const { data: allQueuedImports, error: fetchError } = await supabase
      .from('queued_imports')
      .select('csv_data, csv_analysis, csv_file_name, csv_mapping_template_id, csv_fingerprint, csv_mapping_name, import_setup_id, target_account_id, target_credit_card_id, is_historical, processing_tasks, original_data, transaction_date, description, amount')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .limit(1000);

    if (fetchError || !allQueuedImports || allQueuedImports.length === 0) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    const firstQueuedImport = allQueuedImports[0];
    const hasCsvData = !!firstQueuedImport.csv_data;
    const hasOriginalData = !!firstQueuedImport.original_data;
    
    // Determine if this is an API-based import (has original_data but may or may not have CSV data)
    const isApiImport = hasOriginalData && (!hasCsvData || firstQueuedImport.csv_file_name?.includes('Teller') || firstQueuedImport.csv_file_name?.includes('Account Transactions'));

    let transactions: ParsedTransaction[];
    let csvData: string[][];
    let csvAnalysis: any;
    let csvFileName: string;
    const oldTemplateId = firstQueuedImport.csv_mapping_template_id;

    if (isApiImport) {
      // API-based import: Re-process transactions from original_data using new mapping
      // Get import setup to determine source type
      const { data: importSetup } = await supabase
        .from('automatic_import_setups')
        .select('source_type')
        .eq('id', firstQueuedImport.import_setup_id)
        .single();
      
      const sourceType = importSetup?.source_type || 'unknown';
      
      // Re-process each transaction with new mapping
      transactions = allQueuedImports.map(qi => {
        const originalData = typeof qi.original_data === 'string' 
          ? JSON.parse(qi.original_data) 
          : qi.original_data;
        
        if (sourceType === 'teller') {
          // Re-convert Teller transaction with new mapping
          return convertTellerTransactionToParsed(
            originalData as TellerTransaction,
            qi.target_account_id || undefined,
            qi.target_credit_card_id || undefined,
            mapping // Use new mapping
          );
        } else {
          // For other API sources, use similar logic
          // For now, fall back to CSV parsing if virtual CSV exists
          throw new Error(`API import remapping not yet supported for source type: ${sourceType}`);
        }
      });
      
      // Use virtual CSV data if available, otherwise create it
      if (firstQueuedImport.csv_data) {
        csvData = firstQueuedImport.csv_data as string[][];
        csvAnalysis = firstQueuedImport.csv_analysis;
      } else {
        // Create virtual CSV for future remapping
        const { convertApiTransactionsToVirtualCSV } = await import('@/lib/automatic-imports/api-to-csv-converter');
        const { analyzeCSV } = await import('@/lib/column-analyzer');
        const virtualCSV = convertApiTransactionsToVirtualCSV(
          allQueuedImports.map(qi => ({
            transaction_date: qi.transaction_date,
            description: qi.description,
            amount: qi.amount,
            original_data: qi.original_data,
          })),
          sourceType
        );
        csvData = virtualCSV.csvData;
        csvAnalysis = analyzeCSV(csvData);
      }
      
      csvFileName = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Account Transactions`;
    } else {
      // CSV-based import: Parse CSV with new mapping
      if (!firstQueuedImport.csv_data) {
        return NextResponse.json(
          { error: 'Batch does not have CSV data available for remapping' },
          { status: 404 }
        );
      }
      
      csvData = firstQueuedImport.csv_data as string[][];
      csvAnalysis = firstQueuedImport.csv_analysis as any;
      csvFileName = firstQueuedImport.csv_file_name || 'unknown.csv';

      // Parse CSV with new mapping
      transactions = await parseCSVWithMapping(
        csvData,
        mapping,
        csvFileName
      );
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found with new mapping' },
        { status: 400 }
      );
    }

    // Handle template save/update
    let newTemplateId: number | undefined;
    let mappingName: string | undefined;
    
    // For automatic imports, always update/create the template (even if saveAsTemplate is false)
    // This ensures the mapping persists for future webhook imports
    const isAutomaticImport = !!firstQueuedImport.import_setup_id;
    const shouldUpdateTemplate = saveAsTemplate || isAutomaticImport;
    
    if (shouldUpdateTemplate) {
      // If this is an automatic import with an existing template, update it first
      if (isAutomaticImport && oldTemplateId && !saveAsTemplate) {
        // Update existing template without creating a new one
        const { data: updated, error: updateError } = await supabase
          .from('csv_import_templates')
          .update({
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
          .eq('id', oldTemplateId)
          .eq('user_id', user.id)
          .select('id, template_name')
          .single();

        if (updateError) {
          console.error('Error updating existing template:', updateError);
          // Fall through to create new template if update fails
        } else if (updated) {
          newTemplateId = updated.id;
          mappingName = updated.template_name || 'Saved Template';
          console.log('Updated existing template for automatic import:', { templateId: newTemplateId, templateName: mappingName });
        }
      }
      
      // For automatic imports without an existing template, we'll create one below
      // Set a default template name if not provided
      if (isAutomaticImport && !saveAsTemplate && !templateName && !oldTemplateId) {
        templateName = 'Automatic Import Template';
      }
      
      // If we don't have a template ID yet (either saveAsTemplate is true, or update failed), create/update as requested
      if (!newTemplateId) {
        if (overwriteTemplateId) {
        // Update existing template
        const { data: updated, error: updateError } = await supabase
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

        if (updateError) {
          console.error('Error updating template:', updateError);
          throw new Error(`Failed to update template: ${updateError.message}`);
        }

        if (updated) {
          newTemplateId = updated.id;
          mappingName = updated.template_name || templateName || 'Saved Template';
          console.log('Template updated successfully:', { templateId: newTemplateId, templateName: mappingName });
        } else {
          throw new Error('Template update returned no data');
        }
      } else {
        // Create new template - use Supabase directly since we're server-side
        try {
          const fingerprint = csvAnalysis.fingerprint || firstQueuedImport.csv_fingerprint || '';
          const { data: savedTemplate, error: insertError } = await supabase
            .from('csv_import_templates')
            .insert({
              user_id: user.id,
              template_name: templateName || undefined,
              fingerprint: fingerprint,
              column_count: csvData[0]?.length || 0,
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
              usage_count: 0,
              last_used: new Date().toISOString(),
            })
            .select('id, template_name')
            .single();

          if (insertError) {
            // Handle unique constraint violation (template already exists)
            if (insertError.code === '23505') {
              // Update existing template instead
              const { data: updated, error: updateError } = await supabase
                .from('csv_import_templates')
                .update({
                  template_name: templateName,
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
                .eq('user_id', user.id)
                .eq('fingerprint', fingerprint)
                .select('id, template_name')
                .single();

              if (updateError) {
                throw updateError;
              }
              
              if (updated) {
                newTemplateId = updated.id;
                mappingName = updated.template_name || templateName || 'Saved Template';
                console.log('Template updated (duplicate fingerprint):', { templateId: newTemplateId, templateName: mappingName });
              } else {
                throw new Error('Template update returned no data');
              }
            } else {
              throw insertError;
            }
          } else if (savedTemplate) {
            newTemplateId = savedTemplate.id;
            mappingName = savedTemplate.template_name || templateName || 'Saved Template';
            console.log('Template created successfully:', { templateId: newTemplateId, templateName: mappingName });
          } else {
            throw new Error('Template insert returned no data');
          }
        } catch (err) {
          console.error('Failed to save template:', err);
          throw new Error(`Failed to save template: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

        // Verify template was saved successfully (only if saveAsTemplate was explicitly true)
        if (saveAsTemplate && !newTemplateId) {
          throw new Error('Template save was requested but template ID was not set');
        }
      }
    }
    
    // If no template was saved, generate automatic mapping name
    if (!mappingName) {
      mappingName = generateAutomaticMappingName(csvAnalysis, csvFileName);
    }

    // Get or create manual import setup (or use existing automatic import setup)
    let importSetupId: number;
    if (firstQueuedImport.import_setup_id) {
      // Use existing automatic import setup
      importSetupId = firstQueuedImport.import_setup_id;
    } else {
      // Create manual import setup
      importSetupId = await getOrCreateManualImportSetup(
        undefined,
        firstQueuedImport.target_account_id || null,
        firstQueuedImport.target_credit_card_id || null
      );
    }

    // Apply batch metadata to transactions
    const transactionsWithMetadata = transactions.map(txn => ({
      ...txn,
      account_id: firstQueuedImport.target_account_id || undefined,
      credit_card_id: firstQueuedImport.target_credit_card_id || undefined,
      is_historical: firstQueuedImport.is_historical || false,
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

    // Reset processing tasks after re-mapping
    // Keep csv_mapping as true (since we just re-mapped), reset all others
    const currentTasks = (firstQueuedImport.processing_tasks as any) || {};
    const resetTasks = resetTasksAfterRemap(currentTasks);

    // Queue transactions with SAME batch ID (replacing the old ones)
    // Processing (deduplication, categorization) will happen on client side
    // Preserve is_historical from original batch
    // Pass supabase client to ensure we're using the same connection
    console.log('Queueing transactions with template info:', {
      saveAsTemplate,
      newTemplateId,
      mappingName,
      batchId,
      resetTasks,
    });
    
    const queuedCount = await queueTransactions({
      supabase, // Use same supabase client to ensure consistency
      importSetupId,
      transactions: transactionsWithMetadata,
      sourceBatchId: batchId, // Reuse existing batchId
      isHistorical: firstQueuedImport.is_historical || false,
      csvData,
      csvAnalysis,
      csvFingerprint: csvAnalysis.fingerprint || firstQueuedImport.csv_fingerprint || undefined,
      csvMappingTemplateId: newTemplateId,
      csvFileName,
      csvMappingName: mappingName,
      processingTasks: resetTasks,
    });

    // Update automatic import setup template if this is an automatic import
    if (firstQueuedImport.import_setup_id && newTemplateId) {
      const { data: importSetup } = await supabase
        .from('automatic_import_setups')
        .select('id, source_type, source_config')
        .eq('id', firstQueuedImport.import_setup_id)
        .single();

      if (importSetup && importSetup.source_type !== 'manual') {
        // Check if this is a Teller multi-account setup
        if (importSetup.source_type === 'teller' && importSetup.source_config?.account_mappings) {
          // Determine which Teller account this batch belongs to
          // Extract account_id from original_data (Teller transaction format)
          let tellerAccountId: string | null = null;
          if (firstQueuedImport.original_data) {
            try {
              const originalData = typeof firstQueuedImport.original_data === 'string'
                ? JSON.parse(firstQueuedImport.original_data)
                : firstQueuedImport.original_data;
              tellerAccountId = originalData?.account_id || null;
            } catch (e) {
              console.warn('Failed to parse original_data to find Teller account_id:', e);
            }
          }
          
          // Find the account mapping for this Teller account
          const accountMappings = importSetup.source_config.account_mappings || [];
          const accountMappingIndex = tellerAccountId
            ? accountMappings.findIndex((m: any) => m.teller_account_id === tellerAccountId)
            : -1;
          
          if (tellerAccountId && accountMappingIndex >= 0) {
            // Update per-account template in source_config
            const updatedAccountMappings = [...accountMappings];
            updatedAccountMappings[accountMappingIndex] = {
              ...updatedAccountMappings[accountMappingIndex],
              csv_mapping_template_id: newTemplateId,
            };
            
            await supabase
              .from('automatic_import_setups')
              .update({
                source_config: {
                  ...importSetup.source_config,
                  account_mappings: updatedAccountMappings,
                },
              })
              .eq('id', importSetup.id);
            
            console.log(`Updated per-account template for Teller account ${tellerAccountId} in setup ${importSetup.id} with template ${newTemplateId}`);
          } else {
            // Fallback: update global template if we can't determine the account
            console.warn(`Could not determine Teller account for batch, updating global template instead`);
            await supabase
              .from('automatic_import_setups')
              .update({ csv_mapping_template_id: newTemplateId })
              .eq('id', importSetup.id);
            console.log(`Updated global template for setup ${importSetup.id} with template ${newTemplateId}`);
          }
        } else {
          // Update global template for other automatic import types
          await supabase
            .from('automatic_import_setups')
            .update({ csv_mapping_template_id: newTemplateId })
            .eq('id', importSetup.id);
          console.log(`Updated global template for setup ${importSetup.id} with template ${newTemplateId}`);
        }
      }
    }

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

