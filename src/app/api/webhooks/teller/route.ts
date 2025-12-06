import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAndQueueTellerTransactions } from '@/lib/automatic-imports/providers/teller-service';
import { getDecryptedAccessToken } from '@/lib/automatic-imports/helpers';
import crypto from 'crypto';

/**
 * POST /api/webhooks/teller
 * Handle Teller webhook events
 * 
 * Teller sends webhooks for transaction updates
 * Webhook signature verification is required for security
 */
export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const tellerSigningSecret = process.env.TELLER_WEBHOOK_SECRET;
    if (!tellerSigningSecret) {
      console.error('TELLER_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('Teller-Signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Teller-Signature header' },
        { status: 401 }
      );
    }

    // Parse signature: format is "t=timestamp,v1=signature"
    const signatureMatch = signature.match(/t=(\d+),v1=(.+)/);
    if (!signatureMatch) {
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 401 }
      );
    }

    const [, timestamp, receivedSignature] = signatureMatch;
    const signatureTimestamp = parseInt(timestamp);

    // Check timestamp to prevent replay attacks (reject if older than 3 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (now - signatureTimestamp > 180) {
      return NextResponse.json(
        { error: 'Signature timestamp too old' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.text();

    // Construct signed message: timestamp + body
    const signedMessage = `${timestamp}.${body}`;

    // Compute HMAC-SHA-256
    const computedSignature = crypto
      .createHmac('sha256', tellerSigningSecret)
      .update(signedMessage)
      .digest('hex');

    // Verify signature
    if (computedSignature !== receivedSignature) {
      console.error('Teller webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const event = JSON.parse(body);

    // Handle different event types
    const supabase = createServiceRoleClient();

    switch (event.type) {
      case 'transactions.processed': {
        // Teller webhook structure: { type, payload: { enrollment_id, transactions: [...] } }
        const payload = event.payload || event.data;
        const enrollmentId = payload?.enrollment_id;

        if (!enrollmentId) {
          console.warn('Teller webhook missing enrollment_id');
          return NextResponse.json({ received: true });
        }

        // Find active import setups for this enrollment
        const { data: setups } = await supabase
          .from('automatic_import_setups')
          .select('*')
          .eq('source_type', 'teller')
          .eq('source_identifier', enrollmentId)
          .eq('is_active', true);

        if (!setups || setups.length === 0) {
          console.warn(`No active Teller import setup found for enrollment ${enrollmentId}`);
          return NextResponse.json({ received: true });
        }

        // Process transactions for each setup
        // Group transactions by account_id to fetch efficiently
        const transactions = payload.transactions || [];
        const accountIds = [...new Set(transactions.map((t: any) => t.account_id as string))] as string[];

        for (const setup of setups) {
          const accessToken = getDecryptedAccessToken(setup);
          if (!accessToken) {
            console.warn(`No access token found or failed to decrypt for setup ${setup.id}`);
            continue;
          }

          // Fetch and queue transactions for each account in the enrollment
          for (const tellerAccountId of accountIds) {
            try {
              await fetchAndQueueTellerTransactions({
                importSetupId: setup.id,
                accessToken,
                accountId: tellerAccountId,
                isHistorical: setup.is_historical,
                supabase,
                budgetAccountId: setup.account_id,
              });

              // Update last fetch time
              await supabase
                .from('automatic_import_setups')
                .update({
                  last_fetch_at: new Date().toISOString(),
                  last_successful_fetch_at: new Date().toISOString(),
                })
                .eq('id', setup.id);
            } catch (error: any) {
              console.error(`Error processing Teller webhook for setup ${setup.id}, account ${tellerAccountId}:`, error);
              await supabase
                .from('automatic_import_setups')
                .update({
                  last_fetch_at: new Date().toISOString(),
                  last_error: error.message,
                  error_count: (setup.error_count || 0) + 1,
                })
                .eq('id', setup.id);
            }
          }
        }

        break;
      }

      case 'transaction.created':
      case 'transaction.updated': {
        // Legacy event types (if Teller still sends them)
        const transaction = event.data || event.payload;
        const enrollmentId = transaction?.enrollment_id || transaction?.account?.enrollment_id;

        if (!enrollmentId) {
          console.warn('Teller webhook missing enrollment_id');
          return NextResponse.json({ received: true });
        }

        // Find active import setups for this enrollment
        const { data: setups } = await supabase
          .from('automatic_import_setups')
          .select('*')
          .eq('source_type', 'teller')
          .eq('source_identifier', enrollmentId)
          .eq('is_active', true);

        if (!setups || setups.length === 0) {
          console.warn(`No active Teller import setup found for enrollment ${enrollmentId}`);
          return NextResponse.json({ received: true });
        }

        // Fetch and queue transactions for each setup
        for (const setup of setups) {
          const accessToken = getDecryptedAccessToken(setup);
          if (!accessToken) {
            console.warn(`No access token found or failed to decrypt for setup ${setup.id}`);
            continue;
          }

          // Fetch transactions for the account
          try {
            await fetchAndQueueTellerTransactions({
              importSetupId: setup.id,
              accessToken,
              accountId: transaction.account_id,
              isHistorical: setup.is_historical,
              supabase,
              budgetAccountId: setup.account_id,
            });

            // Update last fetch time
            await supabase
              .from('automatic_import_setups')
              .update({
                last_fetch_at: new Date().toISOString(),
                last_successful_fetch_at: new Date().toISOString(),
              })
              .eq('id', setup.id);
          } catch (error: any) {
            console.error(`Error processing Teller webhook for setup ${setup.id}:`, error);
            await supabase
              .from('automatic_import_setups')
              .update({
                last_fetch_at: new Date().toISOString(),
                last_error: error.message,
                error_count: (setup.error_count || 0) + 1,
              })
              .eq('id', setup.id);
          }
        }

        break;
      }

      default:
        console.log(`Unhandled Teller webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Teller webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
