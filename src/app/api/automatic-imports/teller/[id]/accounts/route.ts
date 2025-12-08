import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';
import { getDecryptedAccessToken } from '@/lib/automatic-imports/helpers';

/**
 * GET /api/automatic-imports/teller/[id]/accounts
 * Get Teller accounts and current mappings for editing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) {
      // checkWriteAccess returns a NextResponse with error, so return it directly
      return accessCheck;
    }

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

    if (setup.source_type !== 'teller') {
      return NextResponse.json(
        { error: 'This endpoint is only for Teller setups' },
        { status: 400 }
      );
    }

    // Decrypt access token
    const accessToken = getDecryptedAccessToken(setup);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found or failed to decrypt' },
        { status: 400 }
      );
    }

    // Fetch accounts from Teller
    let tellerAccounts: any[];
    try {
      tellerAccounts = await fetchTellerAccounts(accessToken);
    } catch (error: any) {
      console.error('Error fetching Teller accounts:', error);
      return NextResponse.json(
        { error: `Failed to fetch accounts from Teller: ${error.message}` },
        { status: 500 }
      );
    }

    // Get current mappings
    const accountMappings = setup.source_config?.account_mappings || [];

    return NextResponse.json({
      enrollmentId: setup.source_identifier,
      institutionName: setup.bank_name || setup.integration_name || 'Unknown Bank',
      accessToken: setup.source_config?.access_token, // Return encrypted token
      accounts: tellerAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency, // Include currency if available
        account_number: acc.account_number || null, // Keep full account_number object
        institution: acc.institution,
      })),
      currentMappings: accountMappings,
    });
  } catch (error: any) {
    console.error('Error in GET /api/automatic-imports/teller/[id]/accounts:', error);
    // If error is already a NextResponse (from checkWriteAccess), return it
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/automatic-imports/teller/[id]/accounts
 * Update account mappings for an existing setup
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const setupId = parseInt(id);

    if (isNaN(setupId)) {
      return NextResponse.json({ error: 'Invalid setup ID' }, { status: 400 });
    }

    const body = await request.json();
    const { accountMappings } = body;

    if (!Array.isArray(accountMappings)) {
      return NextResponse.json(
        { error: 'accountMappings must be an array' },
        { status: 400 }
      );
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

    if (setup.source_type !== 'teller') {
      return NextResponse.json(
        { error: 'This endpoint is only for Teller setups' },
        { status: 400 }
      );
    }

    // Validate that at least one account is enabled
    const enabledCount = accountMappings.filter((m: any) => m.enabled).length;
    if (enabledCount === 0) {
      return NextResponse.json(
        { error: 'At least one account must be enabled' },
        { status: 400 }
      );
    }

    // Process account mappings and create accounts if needed
    const { createAccount, createCreditCard } = await import('@/lib/supabase-queries');
    const processedMappings: any[] = [];

    for (const mapping of accountMappings) {
      let targetAccountId = mapping.target_account_id;
      let targetCreditCardId = mapping.target_credit_card_id;

      // If auto_create is enabled, create the account/credit card
      if (mapping.enabled && mapping.auto_create && mapping.account_name) {
        try {
          if (mapping.account_type === 'credit_card') {
            const creditCard = await createCreditCard({
              name: mapping.account_name,
              credit_limit: 0,
              available_credit: 0,
              include_in_totals: true,
            });
            targetCreditCardId = creditCard.id;
          } else {
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

      processedMappings.push({
        ...mapping,
        target_account_id: targetAccountId || null,
        target_credit_card_id: targetCreditCardId || null,
      });
    }

    // Update setup with new mappings
    const { data: updatedSetup, error: updateError } = await supabase
      .from('automatic_import_setups')
      .update({
        source_config: {
          ...setup.source_config,
          account_mappings: processedMappings,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', setupId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating account mappings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update account mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ setup: updatedSetup });
  } catch (error: any) {
    console.error('Error in PUT /api/automatic-imports/teller/[id]/accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update account mappings' },
      { status: 500 }
    );
  }
}

