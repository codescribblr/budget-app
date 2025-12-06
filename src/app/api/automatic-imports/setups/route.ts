import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { AutomaticImportSetup, ImportSourceType } from '@/lib/automatic-imports/types';

/**
 * GET /api/automatic-imports/setups
 * List all import setups for the active account
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

    const { data, error } = await supabase
      .from('automatic_import_setups')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching import setups:', error);
      return NextResponse.json({ error: 'Failed to fetch import setups' }, { status: 500 });
    }

    return NextResponse.json({ setups: data || [] });
  } catch (error: any) {
    console.error('Error in GET /api/automatic-imports/setups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch import setups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automatic-imports/setups
 * Create a new import setup
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
      source_type,
      source_identifier,
      target_account_id,
      target_credit_card_id,
      is_historical,
      source_config,
      integration_name,
      bank_name,
      account_numbers,
    } = body;

    // Validate required fields
    if (!source_type || !source_identifier) {
      return NextResponse.json(
        { error: 'source_type and source_identifier are required' },
        { status: 400 }
      );
    }

    // Validate source_type
    const validSourceTypes: ImportSourceType[] = ['email', 'plaid', 'yodlee', 'finicity', 'mx', 'teller'];
    if (!validSourceTypes.includes(source_type)) {
      return NextResponse.json(
        { error: `Invalid source_type. Must be one of: ${validSourceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create import setup
    const { data, error } = await supabase
      .from('automatic_import_setups')
      .insert({
        account_id: accountId,
        user_id: user.id,
        source_type,
        source_identifier,
        target_account_id: target_account_id || null,
        target_credit_card_id: target_credit_card_id || null,
        is_historical: is_historical || false,
        is_active: true,
        source_config: source_config || {},
        integration_name: integration_name || null,
        bank_name: bank_name || null,
        account_numbers: account_numbers || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating import setup:', error);
      return NextResponse.json({ error: 'Failed to create import setup' }, { status: 500 });
    }

    return NextResponse.json({ setup: data });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/setups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create import setup' },
      { status: 500 }
    );
  }
}
