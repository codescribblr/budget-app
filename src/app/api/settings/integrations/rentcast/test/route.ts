import { NextRequest, NextResponse } from 'next/server';
import { checkOwnerAccess } from '@/lib/api-helpers';
import { testRentCastApiKey } from '@/lib/integrations/rentcast/client';

export async function POST(request: NextRequest) {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const body = await request.json();
    const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    await testRentCastApiKey(apiKey);

    return NextResponse.json({ success: true, message: 'RentCast API key is valid' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to validate RentCast API key' },
      { status: 400 }
    );
  }
}
