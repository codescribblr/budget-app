import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';
import { encrypt } from '@/lib/encryption';

/**
 * POST /api/automatic-imports/teller/connect
 * Handle Teller Connect success and create import setup
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const {
      accessToken,
      enrollmentId,
      institutionName,
      target_account_id,
      target_credit_card_id,
      is_historical,
    } = body;

    if (!accessToken || !enrollmentId) {
      return NextResponse.json(
        { error: 'accessToken and enrollmentId are required' },
        { status: 400 }
      );
    }

    // Parse and validate target_account_id and target_credit_card_id
    const targetAccountId = target_account_id 
      ? (typeof target_account_id === 'string' ? parseInt(target_account_id, 10) : target_account_id)
      : null;
    const targetCreditCardId = target_credit_card_id
      ? (typeof target_credit_card_id === 'string' ? parseInt(target_credit_card_id, 10) : target_credit_card_id)
      : null;
    const isHistorical = is_historical || false;

    // Fetch accounts from Teller to get account details
    let tellerAccounts: any[] = [];
    try {
      tellerAccounts = await fetchTellerAccounts(accessToken);
    } catch (error: any) {
      console.error('Error fetching Teller accounts:', error);
      return NextResponse.json(
        { error: `Failed to fetch accounts from Teller: ${error.message}` },
        { status: 500 }
      );
    }

    if (tellerAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found in Teller enrollment' },
        { status: 400 }
      );
    }

    // Extract account numbers for display
    const accountNumbers = tellerAccounts
      .map(acc => acc.account_number?.number?.slice(-4))
      .filter(Boolean) as string[];

    // Create import setup
    // Store accessToken encrypted in source_config
    const encryptedAccessToken = encrypt(accessToken);
    
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .insert({
        account_id: accountId,
        user_id: user.id,
        source_type: 'teller',
        source_identifier: enrollmentId,
        target_account_id: targetAccountId || null,
        target_credit_card_id: targetCreditCardId || null,
        is_historical: isHistorical || false,
        is_active: true,
        source_config: {
          access_token: encryptedAccessToken, // Encrypted access token
          enrollment_id: enrollmentId,
          institution_name: institutionName,
          account_ids: tellerAccounts.map(acc => acc.id),
        },
        integration_name: `${institutionName} via Teller`,
        bank_name: institutionName,
        account_numbers: accountNumbers.length > 0 ? accountNumbers : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (setupError) {
      console.error('Error creating Teller import setup:', setupError);
      return NextResponse.json(
        { error: 'Failed to create import setup' },
        { status: 500 }
      );
    }

    // Fetch initial transactions and queue them
    // Fetch transactions for all accounts in the enrollment
    const { fetchAndQueueTellerTransactions } = await import('@/lib/automatic-imports/providers/teller-service');
    
    const fetchPromises = tellerAccounts.map(tellerAccount =>
      fetchAndQueueTellerTransactions({
        importSetupId: setup.id,
        accessToken,
        accountId: tellerAccount.id,
        isHistorical,
        budgetAccountId: accountId, // Use the budget account ID from context
      }).catch(err => {
        console.error(`Error fetching transactions for account ${tellerAccount.id}:`, err);
        return { fetched: 0, queued: 0, errors: [err.message] };
      })
    );

    const results = await Promise.all(fetchPromises);
    
    // Update setup with aggregated results
    const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
    const totalQueued = results.reduce((sum, r) => sum + r.queued, 0);
    const allErrors = results.flatMap(r => r.errors);

    await supabase
      .from('automatic_import_setups')
      .update({
        last_fetch_at: new Date().toISOString(),
        last_successful_fetch_at: allErrors.length === 0 ? new Date().toISOString() : undefined,
        last_error: allErrors.length > 0 ? allErrors.join('; ') : null,
        error_count: allErrors.length > 0 ? allErrors.length : 0,
        last_month_transaction_count: totalFetched,
      })
      .eq('id', setup.id);

    return NextResponse.json({ setup });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/teller/connect:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect Teller account' },
      { status: 500 }
    );
  }
}
