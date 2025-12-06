import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { processEmailAttachments } from '@/lib/automatic-imports/email-processor';
import type { EmailAttachment } from '@/lib/automatic-imports/email-processor';

/**
 * POST /api/webhooks/email-import
 * Handle incoming emails for automatic import
 * 
 * This endpoint should be configured with your email service provider
 * (SendGrid Inbound Parse, AWS SES, Postmark, etc.)
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
    
    const formData = await request.formData();
    
    // Extract email metadata
    const to = formData.get('to') as string;
    const from = formData.get('from') as string;
    const subject = formData.get('subject') as string;
    
    // Extract attachments
    const attachments: EmailAttachment[] = [];
    
    // Handle different email providers' attachment formats
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
    const { supabase } = await getAuthenticatedUser();
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
