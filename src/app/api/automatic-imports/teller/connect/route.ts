import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { fetchTellerAccounts } from '@/lib/automatic-imports/providers/teller-service';
import { encrypt } from '@/lib/encryption';

/**
 * POST /api/automatic-imports/teller/connect
 * Handle Teller Connect success and return accounts for mapping
 * This endpoint fetches accounts but doesn't create the setup yet
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

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

    // Return accounts for mapping (don't create setup yet)
    // Store accessToken temporarily encrypted (will be stored in setup later)
    const encryptedAccessToken = encrypt(accessToken);

    return NextResponse.json({
      enrollmentId,
      institutionName,
      accessToken: encryptedAccessToken, // Return encrypted token for temporary storage
      accounts: tellerAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency, // Include currency if available
        account_number: acc.account_number || null, // Keep full account_number object
        institution: acc.institution,
      })),
    });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/teller/connect:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect Teller account' },
      { status: 500 }
    );
  }
}
