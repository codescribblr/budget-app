import { NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { getRentCastIntegrationForAccountMember } from '@/lib/integrations/rentcast/access';

export async function GET() {
  try {
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const integration = await getRentCastIntegrationForAccountMember(accountId);

    return NextResponse.json({
      is_enabled: integration?.is_enabled ?? false,
      monthly_limit_reached: integration?.monthly_limit_reached ?? false,
      requests_this_month: integration?.requests_this_month ?? 0,
      monthly_request_limit: integration?.config.monthly_request_limit ?? 50,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching RentCast integration status:', error);
    return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
  }
}
