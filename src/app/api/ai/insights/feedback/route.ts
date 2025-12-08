import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId, userHasAccountAccess } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/ai/insights/feedback
 * Save feedback for an insight
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const { insightId, feedback } = await request.json();

    if (!insightId || typeof insightId !== 'string') {
      return NextResponse.json(
        { error: 'insightId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!feedback || !['positive', 'negative'].includes(feedback)) {
      return NextResponse.json(
        { error: 'feedback is required and must be "positive" or "negative"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the insight exists and belongs to the user's account
    const { data: insight, error: fetchError } = await supabase
      .from('ai_insights_cache')
      .select('id, user_id, account_id, feedback, feedback_at')
      .eq('id', insightId)
      .single();

    if (fetchError || !insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this account
    if (insight.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this insight.' },
        { status: 403 }
      );
    }

    const hasAccess = await userHasAccountAccess(insight.account_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this account.' },
        { status: 403 }
      );
    }

    // Check if feedback is already set
    if (insight.feedback) {
      return NextResponse.json({
        success: true,
        insightId: insight.id,
        feedback: insight.feedback,
        feedbackAt: insight.feedback_at,
        message: 'Feedback already provided',
      });
    }

    // Update feedback
    const { data: updatedInsight, error: updateError } = await supabase
      .from('ai_insights_cache')
      .update({
        feedback,
        feedback_at: new Date().toISOString(),
      })
      .eq('id', insightId)
      .eq('user_id', user.id) // Extra security check
      .is('feedback', null) // Only update if feedback is not already set
      .select('id, feedback, feedback_at')
      .maybeSingle();

    if (updateError) {
      console.error('Error updating insight feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to save feedback', message: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedInsight) {
      // Feedback was already set between our check and update
      // Fetch the current state
      const { data: currentInsight } = await supabase
        .from('ai_insights_cache')
        .select('id, feedback, feedback_at')
        .eq('id', insightId)
        .single();

      return NextResponse.json({
        success: true,
        insightId: currentInsight?.id || insightId,
        feedback: currentInsight?.feedback || feedback,
        feedbackAt: currentInsight?.feedback_at,
        message: 'Feedback already provided',
      });
    }

    return NextResponse.json({
      success: true,
      insightId: updatedInsight.id,
      feedback: updatedInsight.feedback,
      feedbackAt: updatedInsight.feedback_at,
    });
  } catch (error: any) {
    console.error('Error saving insight feedback:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to save feedback', message: error.message },
      { status: 500 }
    );
  }
}
