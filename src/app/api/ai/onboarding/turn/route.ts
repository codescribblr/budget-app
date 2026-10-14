import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { handleOnboardingTurn } from '@/lib/ai/onboarding/service';
import { createClient } from '@/lib/supabase/server';
import type { OnboardingTurnRequest, OnboardingUserAction } from '@/lib/ai/onboarding/types';

function isOnboardingEnabledByDefault(): boolean {
  return (
    process.env.AI_ONBOARDING_DEFAULT === 'true' ||
    process.env.NEXT_PUBLIC_AI_ONBOARDING_DEFAULT === 'true'
  );
}

async function isAiOnboardingEnabled(accountId: number): Promise<boolean> {
  if (isOnboardingEnabledByDefault()) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('user_feature_flags')
    .select('enabled')
    .eq('account_id', accountId)
    .eq('feature_name', 'ai_onboarding')
    .maybeSingle();

  return data?.enabled === true;
}

/**
 * POST /api/ai/onboarding/turn
 * One conversational turn of the AI-augmented onboarding agent.
 * Not premium-gated (experiment). Mutations only on confirm_plan / skip.
 */
export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    if (!(await isAiOnboardingEnabled(accountId))) {
      return NextResponse.json(
        {
          error: 'AI onboarding is not enabled',
          message:
            'Enable AI Onboarding Coach in Settings → Features, or set AI_ONBOARDING_DEFAULT=true for local/test.',
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as OnboardingTurnRequest;
    const action = body?.action as OnboardingUserAction | undefined;
    if (!action || typeof action !== 'object' || !action.type) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const rateLimit = await aiRateLimiter.checkLimit(user.id, 'onboarding');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt.toISOString(),
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    const result = await handleOnboardingTurn(user.id, accountId, {
      conversationId: body.conversationId,
      action,
      state: body.state,
    });

    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'onboarding',
      0,
      0,
      0,
      null,
      { actionType: action.type, usedFallback: result.usedFallback }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/ai/onboarding/turn:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to process onboarding turn', message: error.message },
      { status: 500 }
    );
  }
}
