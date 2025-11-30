import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { geminiService } from '@/lib/ai/gemini-service';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/ai/reports
 * Generate custom AI reports
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

    const { reportType, startDate, endDate, options = {} } = await request.json();

    if (!reportType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'reportType, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = await aiRateLimiter.checkLimit(user.id, 'reports');
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

    const supabase = await createClient();

    // Get transactions for the period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('merchant, total_amount, date, categories(name), transaction_type')
      .eq('account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, monthly_amount, current_balance')
      .eq('account_id', accountId)
      .eq('is_goal', false);

    // Get goals
    const { data: goals } = await supabase
      .from('goals')
      .select('name, target_amount, current_amount, status')
      .eq('account_id', accountId)
      .in('status', ['active', 'in_progress']);

    // Build report data based on type
    let reportData: any = {};
    let prompt = '';

    switch (reportType) {
      case 'spending_trends':
        const categoryBreakdown: Record<string, number> = {};
        transactions?.forEach((t) => {
          if (t.transaction_type === 'expense') {
            const catName = (t.categories as any)?.name || 'Uncategorized';
            categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + (t.total_amount || 0);
          }
        });

        reportData = {
          period: { start: startDate, end: endDate },
          totalSpending: transactions?.filter((t) => t.transaction_type === 'expense').reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0,
          categoryBreakdown,
          transactionCount: transactions?.length || 0,
        };

        prompt = `Analyze spending trends for this period and provide insights.

Period: ${startDate} to ${endDate}
Total Spending: $${reportData.totalSpending.toFixed(2)}
Transaction Count: ${reportData.transactionCount}

Category Breakdown:
${Object.entries(categoryBreakdown).map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)}`).join('\n')}

Provide:
1. Overall spending analysis
2. Category trends and patterns
3. Notable changes or anomalies
4. Predictions for next period
5. Recommendations

Format as JSON with sections: summary, trends, predictions, recommendations.`;
        break;

      case 'budget_performance':
        const budgetData: Record<string, { budget: number; spent: number }> = {};
        categories?.forEach((cat) => {
          const spent = transactions?.filter(
            (t) => (t.categories as any)?.name === cat.name && t.transaction_type === 'expense'
          ).reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
          budgetData[cat.name] = {
            budget: cat.monthly_amount || 0,
            spent,
          };
        });

        reportData = {
          period: { start: startDate, end: endDate },
          budgetData,
          goals: goals || [],
        };

        prompt = `Analyze budget performance for this period.

Period: ${startDate} to ${endDate}

Budget vs Actual:
${Object.entries(budgetData).map(([cat, data]) => {
  const variance = data.spent - data.budget;
  const variancePercent = data.budget > 0 ? (variance / data.budget) * 100 : 0;
  return `- ${cat}: Budget $${data.budget.toFixed(2)}, Spent $${data.spent.toFixed(2)}, Variance $${variance.toFixed(2)} (${variancePercent.toFixed(1)}%)`;
}).join('\n')}

Goals:
${goals?.map((g) => `- ${g.name}: $${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)} (${g.status})`).join('\n') || 'None'}

Provide:
1. Overall budget performance summary
2. Category variances analysis
3. Goal progress assessment
4. Recommendations for improvement

Format as JSON with sections: summary, performance, variances, recommendations.`;
        break;

      case 'savings_opportunities':
        const merchantTotals: Record<string, number> = {};
        transactions?.forEach((t) => {
          if (t.transaction_type === 'expense' && t.merchant) {
            merchantTotals[t.merchant] = (merchantTotals[t.merchant] || 0) + (t.total_amount || 0);
          }
        });

        reportData = {
          period: { start: startDate, end: endDate },
          merchantTotals,
          transactions: transactions?.filter((t) => t.transaction_type === 'expense') || [],
        };

        prompt = `Analyze spending patterns and identify savings opportunities.

Period: ${startDate} to ${endDate}

Top Merchants:
${Object.entries(merchantTotals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([merchant, amount]) => `- ${merchant}: $${amount.toFixed(2)}`)
  .join('\n')}

Provide:
1. Spending pattern analysis
2. Potential subscription audits
3. Recurring expense review
4. Optimization suggestions
5. Estimated savings opportunities

Format as JSON with sections: summary, patterns, opportunities, recommendations, estimatedSavings.`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Generate report with AI
    const startTime = Date.now();
    const result = await geminiService.handleChat(prompt, {
      currentBudget: { total: 0, spent: 0, remaining: 0 },
      recentTransactions: [],
      categoryTotals: {},
      monthlySpending: [],
      goals: [],
      accounts: [],
    }, []);

    const responseTimeMs = Date.now() - startTime;

    // Record usage
    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'reports',
      result.tokensUsed,
      0,
      0,
      responseTimeMs,
      { reportType, period: { start: startDate, end: endDate } }
    );

    return NextResponse.json({
      reportType,
      period: { start: startDate, end: endDate },
      analysis: result.response,
      data: reportData,
      tokensUsed: result.tokensUsed,
      responseTimeMs,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate report', message: error.message },
      { status: 500 }
    );
  }
}

