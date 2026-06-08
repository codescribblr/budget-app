import { NextResponse } from 'next/server';

/**
 * GET /api/automatic-imports/email-domain
 * Get the Resend receiving domain for generating email addresses
 * Returns null if not configured (allows page to load without error)
 */
export async function GET() {
  const receivingDomain = process.env.RESEND_RECEIVING_DOMAIN;
  
  // Return null instead of error to allow page to load
  // The UI can handle this gracefully
  return NextResponse.json({ 
    domain: receivingDomain || null,
    configured: !!receivingDomain 
  });
}

