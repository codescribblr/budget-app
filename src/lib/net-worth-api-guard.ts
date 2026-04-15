import { NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { getAuthenticatedUser, isFeatureEnabled } from '@/lib/supabase-queries';
import { getUserSubscription, isPremiumUser } from '@/lib/subscription-utils';

/**
 * Net worth APIs are tied to Retirement Planning (premium). Returns an error response or null if OK.
 */
export async function requireRetirementPlanningNetWorthAccess(): Promise<NextResponse | null> {
  try {
    await getAuthenticatedUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountId = await getActiveAccountId();
  if (!accountId) {
    return NextResponse.json(
      { error: 'No active account. Please select an account first.' },
      { status: 400 }
    );
  }

  const subscription = await getUserSubscription(accountId);
  if (!isPremiumUser(subscription)) {
    return NextResponse.json(
      { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
      { status: 403 }
    );
  }

  const enabled = await isFeatureEnabled('retirement_planning');
  if (!enabled) {
    return NextResponse.json(
      { error: 'Retirement Planning is not enabled for this account.', code: 'FEATURE_DISABLED' },
      { status: 403 }
    );
  }

  return null;
}
