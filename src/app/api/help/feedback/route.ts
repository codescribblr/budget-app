import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/help/feedback
 * Save "Was this helpful?" feedback for a help article
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const body = await request.json();
    const articlePath = typeof body?.articlePath === 'string' ? body.articlePath.trim() : '';
    const wasHelpful = typeof body?.wasHelpful === 'boolean' ? body.wasHelpful : null;
    const feedbackText = typeof body?.feedbackText === 'string' ? body.feedbackText.trim() : null;

    if (!articlePath || articlePath.length > 500) {
      return NextResponse.json(
        { error: 'articlePath is required and must be a non-empty string (max 500 chars)' },
        { status: 400 }
      );
    }

    if (wasHelpful !== true && wasHelpful !== false) {
      return NextResponse.json(
        { error: 'wasHelpful is required and must be a boolean' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from('help_article_feedback').insert({
      article_path: articlePath,
      was_helpful: wasHelpful,
      feedback_text: feedbackText || null,
      user_id: user.id,
    });

    if (error) {
      console.error('Error saving help feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving help feedback:', error);
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to save feedback', message },
      { status: 500 }
    );
  }
}
