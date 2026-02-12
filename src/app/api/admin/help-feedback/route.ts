import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface HelpFeedbackSummary {
  articlePath: string;
  helpful: number;
  notHelpful: number;
  total: number;
  notHelpfulRatio: number;
  recentComments: { text: string; createdAt: string }[];
}

export interface HelpFeedbackAdminResponse {
  byArticle: HelpFeedbackSummary[];
  recentFeedback: {
    id: number;
    articlePath: string;
    wasHelpful: boolean;
    feedbackText: string | null;
    createdAt: string;
  }[];
}

/**
 * GET /api/admin/help-feedback
 * List help article feedback aggregated by article for admin review
 */
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    const { data: rows, error } = await supabase
      .from('help_article_feedback')
      .select('id, article_path, was_helpful, feedback_text, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('Error fetching help feedback:', error);
      return NextResponse.json(
        { error: 'Failed to load feedback', message: error.message },
        { status: 500 }
      );
    }

    const byPath = new Map<
      string,
      { helpful: number; notHelpful: number; comments: { text: string; createdAt: string }[] }
    >();

    for (const row of rows ?? []) {
      const path = row.article_path as string;
      if (!byPath.has(path)) {
        byPath.set(path, { helpful: 0, notHelpful: 0, comments: [] });
      }
      const entry = byPath.get(path)!;
      if (row.was_helpful) {
        entry.helpful += 1;
      } else {
        entry.notHelpful += 1;
        const text = row.feedback_text as string | null;
        if (text && text.trim()) {
          entry.comments.push({
            text: text.trim(),
            createdAt: row.created_at as string,
          });
        }
      }
    }

    const byArticle: HelpFeedbackSummary[] = Array.from(byPath.entries()).map(([articlePath, v]) => ({
      articlePath,
      helpful: v.helpful,
      notHelpful: v.notHelpful,
      total: v.helpful + v.notHelpful,
      notHelpfulRatio: v.helpful + v.notHelpful > 0 ? v.notHelpful / (v.helpful + v.notHelpful) : 0,
      recentComments: v.comments.slice(0, 10),
    }));

    // Sort by notHelpful count descending so least-helpful articles appear first
    byArticle.sort((a, b) => b.notHelpful - a.notHelpful || b.total - a.total);

    const recentFeedback = (rows ?? []).slice(0, 50).map((row) => ({
      id: row.id,
      articlePath: row.article_path,
      wasHelpful: row.was_helpful,
      feedbackText: row.feedback_text,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      byArticle,
      recentFeedback,
    } satisfies HelpFeedbackAdminResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching help feedback:', error);
    if (message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to load feedback', message },
      { status: 500 }
    );
  }
}
