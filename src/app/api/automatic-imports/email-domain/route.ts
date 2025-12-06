import { NextResponse } from 'next/server';

/**
 * GET /api/automatic-imports/email-domain
 * Get the Resend receiving domain for generating email addresses
 */
export async function GET() {
  const receivingDomain = process.env.RESEND_RECEIVING_DOMAIN;
  
  if (!receivingDomain) {
    return NextResponse.json(
      { error: 'RESEND_RECEIVING_DOMAIN not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({ domain: receivingDomain });
}
