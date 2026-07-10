import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { buildUserContext } from '@/lib/ai/context-builder';
import {
  analyzeUserWorkflowProfile,
  buildPersonalizedQuickActions,
} from '@/lib/ai/workflow-guide';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';

/**
 * GET /api/ai/chat/suggestions
 * Returns personalized quick-action chips based on the user's income and debt profile.
 * Does not consume AI chat quota — suggestions are computed locally from user data.
 */
export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    try {
      await requirePremiumSubscription(accountId);
    } catch (error: unknown) {
      if (error instanceof PremiumRequiredError) {
        return NextResponse.json(
          { error: 'Premium subscription required' },
          { status: 403 }
        );
      }
      throw error;
    }

    const context = await buildUserContext(user.id);
    const profile = analyzeUserWorkflowProfile(context);
    const quickActions = buildPersonalizedQuickActions(context);

    return NextResponse.json({
      quickActions: quickActions.map(({ id, label, query }) => ({ id, label, query })),
      profile: {
        incomeProfile: profile.incomeProfile,
        incomeProfileLabel: profile.incomeProfileLabel,
        debtProfile: profile.debtProfile,
        totalCreditCardDebt: profile.totalCreditCardDebt,
        hasIncomeBuffer: profile.hasIncomeBuffer,
      },
    });
  } catch (error: unknown) {
    console.error('Error building chat suggestions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to load suggestions', message },
      { status: 500 }
    );
  }
}
