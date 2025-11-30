import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { geminiService } from '@/lib/ai/gemini-service';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/ai/insights
 * Generate monthly insights
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

    // Require premium subscription for AI insights
    try {
      await requirePremiumSubscription(accountId);
    } catch (error: any) {
      if (error instanceof PremiumRequiredError) {
        return NextResponse.json(
          { error: 'Premium subscription required', message: 'AI Insights is a premium feature. Please upgrade to Premium to use this feature.' },
          { status: 403 }
        );
      }
      throw error;
    }

    const { month, regenerate } = await request.json();

    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Check cache first (unless regenerate requested)
    if (!regenerate) {
      const supabase = await createClient();
      const { data: cached } = await supabase
        .from('ai_insights_cache')
        .select('insights, generated_at')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('insight_type', 'monthly')
        .eq('period_start', startOfMonth.toISOString().split('T')[0])
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        return NextResponse.json({
          insights: cached.insights,
          cached: true,
          generatedAt: cached.generated_at,
          metadata: cached.insights.metadata,
        });
      }
      
      // No cached insights found and regenerate is false - return empty response
      return NextResponse.json({
        insights: null,
        cached: false,
      });
    }

    // Check rate limit - dashboard insights widget uses separate limit
    const rateLimit = await aiRateLimiter.checkLimit(user.id, 'dashboard_insights');
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

    // Gather user data
    const supabase = await createClient();

    // Get transactions for the month
    const { data: transactions } = await supabase
      .from('transactions')
      .select('merchant, total_amount, date, categories(name)')
      .eq('account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0]);

    // Get budget/categories with type information
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, monthly_amount, current_balance, category_type, annual_target, target_balance')
      .eq('account_id', accountId)
      .eq('is_goal', false);

    const categoryBreakdown: Record<string, { budget: number; spent: number; category_type?: string; annual_target?: number }> = {};
    categories?.forEach((cat: any) => {
      categoryBreakdown[cat.name] = {
        budget: cat.monthly_amount || 0,
        spent: Math.abs(cat.current_balance || 0),
        category_type: cat.category_type || 'monthly_expense',
        annual_target: cat.annual_target || undefined,
      };
    });

    // Get goals
    const { data: goals } = await supabase
      .from('goals')
      .select('name, target_amount, current_amount, status')
      .eq('account_id', accountId)
      .in('status', ['active', 'in_progress']);

    // Track metadata about accessed data
    const transactionCount = transactions?.length || 0;
    const categoriesSearched = categories?.length || 0;
    const goalsAccessed = goals?.length || 0;

    // Get previous month data
    const prevMonth = new Date(year, monthNum - 2, 1);
    const prevMonthEnd = new Date(year, monthNum - 1, 0);

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('total_amount, categories(name)')
      .eq('account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', prevMonth.toISOString().split('T')[0])
      .lte('date', prevMonthEnd.toISOString().split('T')[0]);

    const prevCategoryBreakdown: Record<string, number> = {};
    prevTransactions?.forEach((t) => {
      const catName = (t.categories as any)?.name || 'Uncategorized';
      prevCategoryBreakdown[catName] = (prevCategoryBreakdown[catName] || 0) + (t.total_amount || 0);
    });

    const prevTotal = prevTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;

    const totalBudget = categories?.reduce((sum, cat) => sum + (cat.monthly_amount || 0), 0) || 0;
    const totalSpent = transactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;

    // Generate insights
    const result = await geminiService.generateInsights({
      transactions: (transactions || []).map((t) => ({
        merchant: t.merchant || 'Unknown',
        amount: t.total_amount || 0,
        date: t.date,
        category: (t.categories as any)?.name || 'Uncategorized',
      })),
      budget: {
        total: totalBudget,
        spent: totalSpent,
        remaining: totalBudget - totalSpent,
      },
      goals: (goals || []).map((g) => ({
        name: g.name,
        target_amount: g.target_amount,
        current_amount: g.current_amount,
        status: g.status,
      })),
      previousMonth: {
        total: prevTotal,
        categoryBreakdown: prevCategoryBreakdown,
      },
      categoryBreakdown,
    });

    // Add metadata to insights
    const insightsWithMetadata = {
      ...result.insights,
      metadata: {
        transactionCount,
        dateRange: {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0],
        },
        categoriesSearched,
        goalsAccessed,
      },
    };

    // Cache insights for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase.from('ai_insights_cache').insert({
      user_id: user.id,
      account_id: accountId,
      insight_type: 'monthly',
      period_start: startOfMonth.toISOString().split('T')[0],
      period_end: endOfMonth.toISOString().split('T')[0],
      insights: insightsWithMetadata,
      expires_at: expiresAt.toISOString(),
    });

    // Record usage - dashboard insights widget uses separate limit
    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'dashboard_insights',
      result.tokensUsed,
      0,
      0,
      result.responseTimeMs,
      { month: targetMonth }
    );

    return NextResponse.json({
      insights: insightsWithMetadata,
      cached: false,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
      metadata: insightsWithMetadata.metadata,
    });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate insights', message: error.message },
      { status: 500 }
    );
  }
}

