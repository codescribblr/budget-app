import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/debug/check-all-duplicates
 * Diagnostic endpoint to check all transactions marked as duplicates in queued_imports
 * and verify if they actually exist in transactions table
 */
export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId query parameter is required' },
        { status: 400 }
      );
    }

    // Get all queued imports for this batch
    const { data: queuedImports, error: queuedError } = await supabase
      .from('queued_imports')
      .select('id, transaction_date, description, amount, hash, account_id, original_data')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId);

    if (queuedError) {
      return NextResponse.json({ error: queuedError.message }, { status: 500 });
    }

    if (!queuedImports || queuedImports.length === 0) {
      return NextResponse.json({ error: 'No queued imports found for this batch' }, { status: 404 });
    }

    // Extract duplicate information from original_data
    const duplicates = queuedImports.filter(qi => {
      if (!qi.original_data) return false;
      try {
        const originalData = typeof qi.original_data === 'string' 
          ? JSON.parse(qi.original_data) 
          : qi.original_data;
        return originalData.isDuplicate === true;
      } catch {
        return false;
      }
    });

    // For each duplicate, check if it exists in transactions table
    const duplicateAnalysis = await Promise.all(
      duplicates.map(async (dup) => {
        const normalizedDate = dup.transaction_date.trim();
        const normalizedAmount = Math.abs(dup.amount);

        // Check transactions table
        const { data: existingTx, error: txError } = await supabase
          .from('transactions')
          .select('id, date, description, total_amount')
          .eq('budget_account_id', accountId)
          .eq('date', normalizedDate)
          .eq('total_amount', normalizedAmount)
          .limit(5);

        // Check imported_transactions table
        const { data: importedTx, error: importedError } = await supabase
          .from('imported_transactions')
          .select('id, transaction_date, description, amount, account_id, hash')
          .eq('user_id', user.id)
          .eq('hash', dup.hash)
          .limit(5);

        // Check if description matches
        let descriptionMatches = false;
        if (existingTx && existingTx.length > 0) {
          descriptionMatches = existingTx.some(tx => {
            const txDesc = tx.description.toLowerCase().trim();
            const dupDesc = dup.description.toLowerCase().trim();
            return txDesc === dupDesc || 
                   txDesc.includes(dupDesc) || 
                   dupDesc.includes(txDesc);
          });
        }

        return {
          queuedImportId: dup.id,
          date: dup.transaction_date,
          description: dup.description,
          amount: dup.amount,
          hash: dup.hash,
          existsInTransactions: (existingTx?.length || 0) > 0,
          existsInImportedTransactions: (importedTx?.length || 0) > 0,
          descriptionMatches,
          transactionMatches: existingTx || [],
          importedTransactionMatches: importedTx || [],
          shouldBeDuplicate: (existingTx?.length || 0) > 0 && descriptionMatches,
        };
      })
    );

    const falsePositives = duplicateAnalysis.filter(d => !d.shouldBeDuplicate);
    const truePositives = duplicateAnalysis.filter(d => d.shouldBeDuplicate);

    return NextResponse.json({
      accountId,
      userId: user.id,
      batchId,
      summary: {
        totalQueuedImports: queuedImports.length,
        totalDuplicates: duplicates.length,
        falsePositives: falsePositives.length,
        truePositives: truePositives.length,
      },
      falsePositives: falsePositives.slice(0, 20), // Limit to first 20
      analysis: duplicateAnalysis.slice(0, 50), // Limit to first 50 for response size
    });
  } catch (error: any) {
    console.error('Error checking all duplicates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}

