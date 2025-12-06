import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAndQueueTellerTransactions } from '@/lib/automatic-imports/providers/teller-service';

/**
 * POST /api/automatic-imports/teller/fetch
 * Fetch transactions from Teller and queue them
 * Called internally after Teller Connect or via webhook/scheduled job
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      importSetupId,
      accessToken,
      tellerAccountId,
      isHistorical,
      startDate,
      endDate,
    } = body;

    if (!importSetupId || !accessToken || !tellerAccountId) {
      return NextResponse.json(
        { error: 'importSetupId, accessToken, and tellerAccountId are required' },
        { status: 400 }
      );
    }

    // Use service role client to update setup status
    const supabase = createServiceRoleClient();

    // Fetch setup to get account_id and is_historical
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .select('account_id, is_historical')
      .eq('id', importSetupId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json(
        { error: 'Import setup not found' },
        { status: 404 }
      );
    }

    // Fetch and queue transactions
    const result = await fetchAndQueueTellerTransactions({
      importSetupId,
      accessToken,
      accountId: tellerAccountId,
      isHistorical: isHistorical !== undefined ? isHistorical : setup.is_historical,
      startDate,
      endDate,
      supabase,
      budgetAccountId: setup.account_id,
    });

    // Get current error count
    const { data: currentSetup } = await supabase
      .from('automatic_import_setups')
      .select('error_count')
      .eq('id', importSetupId)
      .single();

    const currentErrorCount = currentSetup?.error_count || 0;

    // Update setup with last fetch info
    await supabase
      .from('automatic_import_setups')
      .update({
        last_fetch_at: new Date().toISOString(),
        last_successful_fetch_at: result.errors.length === 0 ? new Date().toISOString() : undefined,
        last_error: result.errors.length > 0 ? result.errors.join('; ') : null,
        error_count: result.errors.length > 0 ? currentErrorCount + 1 : 0,
      })
      .eq('id', importSetupId);

    return NextResponse.json({
      success: true,
      fetched: result.fetched,
      queued: result.queued,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error fetching Teller transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Teller transactions' },
      { status: 500 }
    );
  }
}
