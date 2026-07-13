import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';
import { encrypt } from '@/lib/encryption';

/**
 * POST /api/automatic-imports/teller/reconnect
 * Refresh an existing Teller enrollment after the bank connection was disconnected.
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { setupId, accessToken, enrollmentId } = body;

    if (!setupId || !accessToken || !enrollmentId) {
      return NextResponse.json(
        { error: 'setupId, accessToken, and enrollmentId are required' },
        { status: 400 }
      );
    }

    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .select('*')
      .eq('id', setupId)
      .eq('account_id', accountId)
      .eq('source_type', 'teller')
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: 'Import setup not found' }, { status: 404 });
    }

    if (setup.source_identifier !== enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment does not match this import setup. Connect the same bank account you originally linked.' },
        { status: 400 }
      );
    }

    // Verify the new token works before saving it
    try {
      await fetchTellerAccounts(accessToken);
    } catch (error: any) {
      console.error('Error verifying Teller reconnection:', error);
      return NextResponse.json(
        { error: 'Could not verify the bank connection. Please try connecting again.' },
        { status: 400 }
      );
    }

    const encryptedAccessToken = encrypt(accessToken);
    const { error: updateError } = await supabase
      .from('automatic_import_setups')
      .update({
        source_config: {
          ...setup.source_config,
          access_token: encryptedAccessToken,
        },
        last_error: null,
        error_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', setup.id);

    if (updateError) {
      console.error('Error updating Teller setup after reconnect:', updateError);
      return NextResponse.json(
        { error: 'Failed to save the reconnected bank account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      setupId: setup.id,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/teller/reconnect:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reconnect bank account' },
      { status: 500 }
    );
  }
}
