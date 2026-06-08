import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';
import { encrypt } from '@/lib/encryption';

/**
 * POST /api/automatic-imports/teller/connect
 * Handle Teller Connect success, fetch accounts, and create import setup immediately
 * Setup is created with all accounts disabled so user can configure mappings later
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
    } = body;

    if (!accessToken || !enrollmentId) {
      return NextResponse.json(
        { error: 'accessToken and enrollmentId are required' },
        { status: 400 }
      );
    }

    // Check if setup already exists for this enrollment
    const { data: existingSetup } = await supabase
      .from('automatic_import_setups')
      .select('id')
      .eq('source_type', 'teller')
      .eq('source_identifier', enrollmentId)
      .eq('account_id', accountId)
      .single();

    if (existingSetup) {
      // Setup already exists, return it so user can edit mappings
      const { data: setup } = await supabase
        .from('automatic_import_setups')
        .select('*')
        .eq('id', existingSetup.id)
        .single();

      // Fetch accounts from Teller
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

      return NextResponse.json({
        setupId: setup.id,
        enrollmentId,
        institutionName,
        accessToken: setup.source_config?.access_token, // Return encrypted token from existing setup
        accounts: tellerAccounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          currency: acc.currency,
          account_number: acc.account_number || null,
          institution: acc.institution,
        })),
        existingMappings: setup.source_config?.account_mappings || [],
      });
    }

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

    // Encrypt access token
    const encryptedAccessToken = encrypt(accessToken);

    // Create account mappings with all accounts disabled by default
    const accountMappings = tellerAccounts.map(acc => ({
      teller_account_id: acc.id,
      enabled: false, // All disabled initially - user will enable in mapping dialog
      is_historical: false,
      target_account_id: null,
      target_credit_card_id: null,
      auto_create: false,
      account_type: acc.type === 'depository' ? 'checking' : acc.type === 'credit' ? 'credit_card' : 'checking',
      account_name: acc.name,
    }));

    // Extract account numbers for display
    const accountNumbers: string[] = tellerAccounts
      .map(acc => acc.account_number?.number)
      .filter((num): num is string => !!num);

    // Create import setup immediately with all accounts disabled
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .insert({
        account_id: accountId,
        user_id: user.id,
        source_type: 'teller',
        source_identifier: enrollmentId,
        target_account_id: null,
        target_credit_card_id: null,
        is_historical: false,
        is_active: false, // Inactive until user enables at least one account
        source_config: {
          access_token: encryptedAccessToken,
          enrollment_id: enrollmentId,
          institution_name: institutionName,
          account_mappings: accountMappings,
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

    return NextResponse.json({
      setupId: setup.id,
      enrollmentId,
      institutionName,
      accessToken: encryptedAccessToken,
      accounts: tellerAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        account_number: acc.account_number || null,
        institution: acc.institution,
      })),
      existingMappings: accountMappings,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/teller/connect:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect Teller account' },
      { status: 500 }
    );
  }
}

