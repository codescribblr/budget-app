import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { encrypt } from '@/lib/encryption';
import { createAccount, createCreditCard } from '@/lib/supabase-queries';

interface AccountMapping {
  teller_account_id: string;
  enabled: boolean;
  is_historical?: boolean; // Per-account historical flag
  target_account_id?: number | null;
  target_credit_card_id?: number | null;
  auto_create?: boolean;
  account_type?: 'checking' | 'savings' | 'cash' | 'credit_card';
  account_name?: string;
}

/**
 * POST /api/automatic-imports/teller/save-mappings
 * Save account mappings and create import setup
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
      enrollmentId,
      institutionName,
      accessToken, // This should be the encrypted token from connect endpoint
      accountMappings,
    } = body;

    if (!enrollmentId || !accessToken || !Array.isArray(accountMappings)) {
      return NextResponse.json(
        { error: 'enrollmentId, accessToken, and accountMappings are required' },
        { status: 400 }
      );
    }

    // Process account mappings and create accounts if needed
    const processedMappings: AccountMapping[] = [];
    const enabledMappings: AccountMapping[] = [];

    for (const mapping of accountMappings as AccountMapping[]) {
      let targetAccountId = mapping.target_account_id;
      let targetCreditCardId = mapping.target_credit_card_id;

      // If auto_create is enabled, create the account/credit card
      if (mapping.enabled && mapping.auto_create && mapping.account_name) {
        try {
          if (mapping.account_type === 'credit_card') {
            // Create credit card
            const creditCard = await createCreditCard({
              name: mapping.account_name,
              credit_limit: 0,
              available_credit: 0,
              include_in_totals: true,
            });
            targetCreditCardId = creditCard.id;
          } else {
            // Create account
            const account = await createAccount({
              name: mapping.account_name,
              account_type: mapping.account_type || 'checking',
              balance: 0,
              include_in_totals: true,
            });
            targetAccountId = account.id;
          }
        } catch (error: any) {
          console.error(`Error creating account for mapping ${mapping.teller_account_id}:`, error);
          // Continue with other mappings even if one fails
        }
      }

      const processedMapping: AccountMapping = {
        ...mapping,
        target_account_id: targetAccountId || null,
        target_credit_card_id: targetCreditCardId || null,
      };

      processedMappings.push(processedMapping);
      if (mapping.enabled) {
        enabledMappings.push(processedMapping);
      }
    }

    if (enabledMappings.length === 0) {
      return NextResponse.json(
        { error: 'At least one account must be enabled' },
        { status: 400 }
      );
    }

    // Extract account numbers for display
    // Account numbers should be passed from frontend in the account data
    // For now, we'll extract from account names or leave empty
    const accountNumbers: string[] = [];

    // Create import setup with account mappings in source_config
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .insert({
        account_id: accountId,
        user_id: user.id,
        source_type: 'teller',
        source_identifier: enrollmentId,
        target_account_id: null, // No single target account - using mappings instead
        target_credit_card_id: null,
        is_historical: false, // Global flag deprecated, using per-account is_historical in mappings
        is_active: true,
        source_config: {
          access_token: accessToken, // Already encrypted from connect endpoint
          enrollment_id: enrollmentId,
          institution_name: institutionName,
          account_mappings: processedMappings, // Store all mappings
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

    // Fetch initial transactions for enabled accounts
    const { fetchAndQueueTellerTransactions } = await import('@/lib/automatic-imports/providers/teller-service');
    const { getDecryptedAccessToken } = await import('@/lib/automatic-imports/helpers');
    
    // Decrypt access token for fetching
    const decryptedToken = getDecryptedAccessToken({
      source_config: { access_token: accessToken },
    } as any);

    if (!decryptedToken) {
      return NextResponse.json(
        { error: 'Failed to decrypt access token' },
        { status: 500 }
      );
    }

    const fetchPromises = enabledMappings.map(mapping =>
      fetchAndQueueTellerTransactions({
        importSetupId: setup.id,
        accessToken: decryptedToken,
        accountId: mapping.teller_account_id,
        isHistorical: mapping.is_historical || false, // Use per-account is_historical
        budgetAccountId: accountId,
        supabase,
        targetAccountId: mapping.target_account_id || null,
        targetCreditCardId: mapping.target_credit_card_id || null,
      }).catch(err => {
        console.error(`Error fetching transactions for account ${mapping.teller_account_id}:`, err);
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
    console.error('Error in POST /api/automatic-imports/teller/save-mappings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save account mappings' },
      { status: 500 }
    );
  }
}

