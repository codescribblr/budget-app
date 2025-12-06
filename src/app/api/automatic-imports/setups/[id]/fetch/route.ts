import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAndQueueTellerTransactions, fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';

/**
 * POST /api/automatic-imports/setups/[id]/fetch
 * Manually trigger a fetch for an import setup
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const setupId = parseInt(id);

    if (isNaN(setupId)) {
      return NextResponse.json({ error: 'Invalid setup ID' }, { status: 400 });
    }

    // Fetch setup
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .select('*')
      .eq('id', setupId)
      .eq('account_id', accountId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: 'Import setup not found' }, { status: 404 });
    }

    if (!setup.is_active) {
      return NextResponse.json({ error: 'Import setup is not active' }, { status: 400 });
    }

    // Use service role client for fetching
    const serviceSupabase = createServiceRoleClient();

    // Handle different source types
    if (setup.source_type === 'teller') {
      const accessToken = setup.source_config?.access_token;
      if (!accessToken) {
        return NextResponse.json(
          { error: 'No access token found for Teller setup' },
          { status: 400 }
        );
      }

      // Get account IDs from source_config or fetch all accounts
      const accountIds = setup.source_config?.account_ids || [];
      
      if (accountIds.length === 0) {
        // Fetch accounts from Teller
        const tellerAccounts = await fetchTellerAccounts(accessToken);
        accountIds.push(...tellerAccounts.map(acc => acc.id));
      }

      // Fetch transactions for each account
      const results = await Promise.all(
        accountIds.map(tellerAccountId =>
          fetchAndQueueTellerTransactions({
            importSetupId: setup.id,
            accessToken,
            accountId: tellerAccountId,
            isHistorical: setup.is_historical,
            supabase: serviceSupabase,
            budgetAccountId: setup.account_id,
          }).catch(err => ({
            fetched: 0,
            queued: 0,
            errors: [err.message],
          }))
        )
      );

      const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
      const totalQueued = results.reduce((sum, r) => sum + r.queued, 0);
      const allErrors = results.flatMap(r => r.errors);

      // Update setup status
      await serviceSupabase
        .from('automatic_import_setups')
        .update({
          last_fetch_at: new Date().toISOString(),
          last_successful_fetch_at: allErrors.length === 0 ? new Date().toISOString() : undefined,
          last_error: allErrors.length > 0 ? allErrors.join('; ') : null,
          error_count: allErrors.length > 0 ? (setup.error_count || 0) + allErrors.length : 0,
        })
        .eq('id', setup.id);

      return NextResponse.json({
        success: true,
        fetched: totalFetched,
        queued: totalQueued,
        errors: allErrors,
      });
    } else {
      return NextResponse.json(
        { error: `Manual fetch not supported for ${setup.source_type} imports` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/setups/[id]/fetch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
