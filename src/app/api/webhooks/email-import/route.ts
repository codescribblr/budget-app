import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { processEmailAttachments } from '@/lib/automatic-imports/email-processor';
import type { EmailAttachment } from '@/lib/automatic-imports/email-processor';

/**
 * POST /api/webhooks/email-import
 * Handle incoming emails for automatic import
 * 
 * Supports multiple email providers:
 * - Resend (JSON webhook with API calls for attachments)
 * - SendGrid Inbound Parse (form-data)
 * - Postmark (form-data)
 * - AWS SES (form-data)
 * 
 * Expected payload format varies by provider, but should include:
 * - To/Recipient: unique email address identifying the import setup
 * - Attachments: PDF/CSV files
 * - From: original sender
 */
export async function POST(request: Request) {
  try {
    // Verify webhook signature if configured
    // TODO: Add webhook signature verification based on email provider
    
    const contentType = request.headers.get('content-type') || '';
    let to: string;
    let attachments: EmailAttachment[] = [];
    
    // Detect provider by content type
    if (contentType.includes('application/json')) {
      // Resend webhook format (JSON)
      const resendWebhook = await request.json();
      
      // Resend webhook payload structure:
      // { type: 'email.received', data: { email_id, from, to, subject, ... } }
      if (resendWebhook.type !== 'email.received') {
        return NextResponse.json(
          { error: 'Invalid webhook event type' },
          { status: 400 }
        );
      }
      
      const emailData = resendWebhook.data;
      to = emailData.to;
      const emailId = emailData.email_id;
      
      if (!emailId) {
        return NextResponse.json(
          { error: 'Missing email_id in Resend webhook' },
          { status: 400 }
        );
      }
      
      // Fetch attachments from Resend API
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return NextResponse.json(
          { error: 'RESEND_API_KEY not configured' },
          { status: 500 }
        );
      }
      
      // Get attachments list
      const attachmentsResponse = await fetch(
        `https://api.resend.com/emails/${emailId}/attachments`,
        {
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
          },
        }
      );
      
      if (!attachmentsResponse.ok) {
        console.error('Error fetching attachments from Resend:', await attachmentsResponse.text());
        return NextResponse.json(
          { error: 'Failed to fetch attachments from Resend' },
          { status: 500 }
        );
      }
      
      const attachmentsData = await attachmentsResponse.json();
      
      // Resend API returns: { data: [{ id, filename, content_type, size, download_url }] }
      const attachmentList = attachmentsData.data || attachmentsData || [];
      
      // Download each attachment
      for (const attachment of attachmentList) {
        if (!attachment.download_url) {
          console.warn(`Attachment ${attachment.filename || attachment.id} missing download_url`);
          continue;
        }
        
        try {
          const downloadResponse = await fetch(attachment.download_url);
          if (!downloadResponse.ok) {
            console.error(`Failed to download attachment: ${downloadResponse.statusText}`);
            continue;
          }
          
          const buffer = Buffer.from(await downloadResponse.arrayBuffer());
          attachments.push({
            filename: attachment.filename || `attachment-${attachment.id}`,
            contentType: attachment.content_type || attachment.contentType || 'application/octet-stream',
            content: buffer,
          });
        } catch (error) {
          console.error(`Error downloading attachment ${attachment.filename || attachment.id}:`, error);
        }
      }
    } else {
      // Form-data format (SendGrid, Postmark, etc.)
      const formData = await request.formData();
      
      // Extract email metadata
      to = formData.get('to') as string;
      
      // Extract attachments
      // SendGrid format
      const attachmentCount = parseInt(formData.get('attachments') as string) || 0;
      for (let i = 1; i <= attachmentCount; i++) {
        const file = formData.get(`attachment${i}`) as File;
        if (file) {
          const buffer = Buffer.from(await file.arrayBuffer());
          attachments.push({
            filename: file.name,
            contentType: file.type,
            content: buffer,
          });
        }
      }
      
      // Alternative: Check for files directly in formData
      for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.name) {
          const buffer = Buffer.from(await value.arrayBuffer());
          attachments.push({
            filename: value.name,
            contentType: value.type,
            content: buffer,
          });
        }
      }
    }

    if (attachments.length === 0) {
      return NextResponse.json(
        { error: 'No attachments found in email' },
        { status: 400 }
      );
    }

    // Extract import setup ID from email address
    // Format: user123+setup456@imports.budgetapp.com
    // Or: setup-456@imports.budgetapp.com
    const emailMatch = to.match(/setup[_-]?(\d+)|(\d+)\+setup(\d+)/i);
    if (!emailMatch) {
      return NextResponse.json(
        { error: 'Could not identify import setup from email address' },
        { status: 400 }
      );
    }

    const importSetupId = parseInt(emailMatch[1] || emailMatch[3]);
    if (isNaN(importSetupId)) {
      return NextResponse.json(
        { error: 'Invalid import setup ID in email address' },
        { status: 400 }
      );
    }

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

    // Generate batch ID
    const sourceBatchId = `email-${Date.now()}-${Math.random().toString(36).substring(7)}`;

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
      success: true,
      processed: result.processed,
      queued: result.queued,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error processing email import:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process email import' },
      { status: 500 }
    );
  }
}
