import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { processEmailAttachments } from '@/lib/automatic-imports/email-processor';
import type { EmailAttachment } from '@/lib/automatic-imports/email-processor';

/** Receive authenticated Resend events. Unsigned multipart providers are unsupported. */
export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Only signed Resend JSON events are supported' }, { status: 415 });
    }
    const signingSecret = process.env.RESEND_WEBHOOK_SECRET;
    const apiKey = process.env.RESEND_API_KEY;
    const domain = process.env.RESEND_RECEIVING_DOMAIN?.trim().toLowerCase();
    if (!signingSecret?.trim() || !apiKey?.trim() || !domain) {
      return NextResponse.json({ error: 'Email webhook not configured' }, { status: 503 });
    }
    const id = request.headers.get('svix-id');
    const timestamp = request.headers.get('svix-timestamp');
    const signature = request.headers.get('svix-signature');
    if (!id || !timestamp || !signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }
    const resend = new Resend(apiKey);
    let event;
    try {
      // Verification also checks the timestamp and returns the authenticated JSON.
      event = resend.webhooks.verify({
        payload: await request.text(), headers: { id, timestamp, signature }, webhookSecret: signingSecret,
      });
    } catch {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
    if (event.type !== 'email.received') {
      return NextResponse.json({ received: true, ignored: true });
    }
    const emailId = event.data?.email_id;
    if (typeof emailId !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(emailId)) {
      return NextResponse.json({ error: 'Invalid received email ID' }, { status: 400 });
    }
    const recipients = Array.isArray(event.data.to) ? event.data.to : [event.data.to];
    const setupIds = new Set(recipients.flatMap(recipient => {
      const match = typeof recipient === 'string' && recipient.trim().match(/^setup[_-](\d+)@([^<>\s]+)$/i);
      if (!match || match[2].toLowerCase() !== domain) return [];
      const setupId = Number(match[1]);
      return Number.isSafeInteger(setupId) && setupId > 0 ? [setupId] : [];
    }));
    if (setupIds.size !== 1) {
      return NextResponse.json({ error: 'A single valid import recipient is required' }, { status: 400 });
    }
    const importSetupId = [...setupIds][0];

    // Verify import setup exists and is active
    // Use service role client since webhooks come from external services
    const supabase = createServiceRoleClient();
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .select('*')
      .eq('id', importSetupId)
      .eq('source_type', 'email')
      .eq('is_active', true)
      .single();

    if (setupError || !setup) {
      return NextResponse.json(
        { error: 'Import setup not found or inactive' },
        { status: 404 }
      );
    }

    // Resolve the setup before fetching attachments; use the receiving API, not sent mail.
    const attachments: EmailAttachment[] = [];
    let after: string | undefined;
    const seenCursors = new Set<string>();
    do {
      const { data, error } = await resend.emails.receiving.attachments.list({ emailId, ...(after ? { after } : {}) });
      if (error || !data || !Array.isArray(data.data)) {
        return NextResponse.json({ error: 'Failed to list received attachments' }, { status: 502 });
      }
      for (const attachment of data.data) {
        if (!attachment.download_url) {
          return NextResponse.json({ error: 'Received attachment is unavailable' }, { status: 502 });
        }
        const download = await fetch(attachment.download_url, { signal: AbortSignal.timeout(30_000) });
        if (!download.ok) {
          return NextResponse.json({ error: 'Failed to download received attachment' }, { status: 502 });
        }
        attachments.push({
          filename: attachment.filename || `attachment-${attachment.id}`,
          contentType: attachment.content_type || 'application/octet-stream',
          content: Buffer.from(await download.arrayBuffer()),
        });
      }
      after = data.has_more ? data.data.at(-1)?.id : undefined;
      if (data.has_more && (!after || seenCursors.has(after))) {
        return NextResponse.json({ error: 'Invalid attachment pagination' }, { status: 502 });
      }
      if (after) seenCursors.add(after);
    } while (after);
    if (!attachments.length) {
      return NextResponse.json({ error: 'No attachments found in email' }, { status: 400 });
    }

    // Generate batch ID
    const sourceBatchId = `email-${emailId}`;

    // Process attachments
    const result = await processEmailAttachments({
      importSetupId,
      attachments,
      sourceBatchId,
      isHistorical: setup.is_historical,
      accountId: setup.account_id,
      supabase,
    });

    // Update setup with last fetch info
    await supabase
      .from('automatic_import_setups')
      .update({
        last_fetch_at: new Date().toISOString(),
        last_successful_fetch_at: result.errors.length === 0 ? new Date().toISOString() : undefined,
        last_error: result.errors.length > 0 ? result.errors.join('; ') : null,
        error_count: result.errors.length > 0 ? (setup.error_count || 0) + 1 : 0,
      })
      .eq('id', importSetupId);

    return NextResponse.json({
      success: result.errors.length === 0,
      processed: result.processed,
      queued: result.queued,
      errors: result.errors,
    }, { status: result.errors.length ? 500 : 200 });
  } catch (error: any) {
    console.error('Email import failed; provider retry required');
    return NextResponse.json(
      { error: 'Failed to process email import' },
      { status: 500 }
    );
  }
}

