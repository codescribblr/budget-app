import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';
import { getDecryptedAccessToken } from '@/lib/automatic-imports/helpers';

/**
 * GET /api/automatic-imports/teller/refresh
 * Refresh and return all existing Teller setups with their current account information
 * This helps users see what institutions they've connected and can finish setting up
 */
export async function GET() {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Fetch all Teller setups for this account
    const { data: setups, error: setupsError } = await supabase
      .from('automatic_import_setups')
      .select('*')
      .eq('account_id', accountId)
      .eq('source_type', 'teller')
      .order('created_at', { ascending: false });

    if (setupsError) {
      console.error('Error fetching Teller setups:', setupsError);
      return NextResponse.json(
        { error: 'Failed to fetch Teller setups' },
        { status: 500 }
      );
    }

    // For each setup, try to fetch current accounts from Teller
    const setupsWithAccounts = await Promise.all(
      (setups || []).map(async (setup) => {
        try {
          const accessToken = getDecryptedAccessToken(setup);
          if (!accessToken) {
            return {
              ...setup,
              accounts: [],
              error: 'No access token found',
            };
          }

          const accounts = await fetchTellerAccounts(accessToken);
          return {
            ...setup,
            accounts: accounts.map(acc => ({
              id: acc.id,
              name: acc.name,
              type: acc.type,
              currency: acc.currency,
              account_number: acc.account_number || null,
              institution: acc.institution,
            })),
            error: null,
          };
        } catch (error: any) {
          console.error(`Error fetching accounts for setup ${setup.id}:`, error);
          return {
            ...setup,
            accounts: [],
            error: error.message || 'Failed to fetch accounts',
          };
        }
      })
    );

    return NextResponse.json({
      setups: setupsWithAccounts,
      message: setupsWithAccounts.length === 0
        ? 'No Teller connections found. Connect a bank account to get started.'
        : `Found ${setupsWithAccounts.length} connected institution(s).`,
    });
  } catch (error: any) {
    console.error('Error in GET /api/automatic-imports/teller/refresh:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh Teller connections' },
      { status: 500 }
    );
  }
}

