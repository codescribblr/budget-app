import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId, userHasAccountAccess } from '@/lib/account-context';
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

    // Explicitly verify user has access to this account (security check)
    const hasAccess = await userHasAccountAccess(accountId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this account.' },
        { status: 403 }
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
      const { supabase } = await getAuthenticatedUser();
      const { data: cached } = await supabase
        .from('ai_insights_cache')
        .select('id, insights, generated_at, feedback, feedback_at')
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
          insightId: cached.id,
          feedback: cached.feedback,
          feedbackAt: cached.feedback_at,
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
    // SECURITY: All queries below MUST filter by accountId to ensure we only access data
    // from the currently active account that the user has access to.
    const { supabase } = await getAuthenticatedUser();

    const monthStart = startOfMonth.toISOString().split('T')[0];
    const monthEnd = endOfMonth.toISOString().split('T')[0];
    const startOfYear = new Date(year, 0, 1);
    const yearStart = startOfYear.toISOString().split('T')[0];

    // Get transactions for the month (use budget_account_id to match budgeting views)
    // SECURITY: Filtered by budget_account_id = accountId
    // Note: Categories are linked through transaction_splits, so we fetch them separately
    // Note: Merchant comes from merchant_groups, not a direct column
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        total_amount,
        date,
        transaction_type,
        account_id,
        credit_card_id,
        merchant_group_id,
        merchant_groups(display_name),
        accounts(name),
        credit_cards(name)
      `)
      .eq('budget_account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (txError) {
      console.error('Error fetching transactions:', txError);
    }

    // Get year-to-date transactions for annual/accumulation comparisons
    // SECURITY: Filtered by budget_account_id = accountId
    const { data: ytdTransactions, error: ytdTxError } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        total_amount,
        date,
        transaction_type,
        account_id,
        credit_card_id,
        merchant_group_id,
        merchant_groups(display_name),
        accounts(name),
        credit_cards(name)
      `)
      .eq('budget_account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', yearStart)
      .lte('date', monthEnd);

    if (ytdTxError) {
      console.error('Error fetching YTD transactions:', ytdTxError);
    }

    // Get transaction splits with categories for current month transactions
    const transactionIds = (transactions || []).map((t: any) => t.id);
    const ytdTransactionIds = (ytdTransactions || []).map((t: any) => t.id);
    const allTransactionIds = [...new Set([...transactionIds, ...ytdTransactionIds])];

    let splitsByTransaction: Map<number, Array<{ category_name: string; amount: number }>> = new Map();
    if (allTransactionIds.length > 0) {
      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select(`
          transaction_id,
          amount,
          categories (
            name
          )
        `)
        .in('transaction_id', allTransactionIds);

      if (!splitsError && splits) {
        splits.forEach((split: any) => {
          if (!splitsByTransaction.has(split.transaction_id)) {
            splitsByTransaction.set(split.transaction_id, []);
          }
          splitsByTransaction.get(split.transaction_id)!.push({
            category_name: split.categories?.name || 'Uncategorized',
            amount: split.amount || 0,
          });
        });
      }
    }

    // Get budget/categories with type information
    // SECURITY: Filtered by account_id = accountId
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, monthly_amount, current_balance, category_type, annual_target, target_balance')
      .eq('account_id', accountId)
      .eq('is_goal', false);

    // Spend maps for current month and year-to-date
    // Use splits to get accurate category spending
    const monthCategorySpend: Record<string, number> = {};
    (transactions || []).forEach((t: any) => {
      const splits = splitsByTransaction.get(t.id) || [];
      if (splits.length > 0) {
        splits.forEach((split) => {
          const catName = split.category_name || 'Uncategorized';
          monthCategorySpend[catName] = (monthCategorySpend[catName] || 0) + Math.abs(split.amount || 0);
        });
      } else {
        // Fallback: if no splits, use total_amount as Uncategorized
        monthCategorySpend['Uncategorized'] = (monthCategorySpend['Uncategorized'] || 0) + Math.abs(t.total_amount || 0);
      }
    });

    const ytdCategorySpend: Record<string, number> = {};
    (ytdTransactions || []).forEach((t: any) => {
      const splits = splitsByTransaction.get(t.id) || [];
      if (splits.length > 0) {
        splits.forEach((split) => {
          const catName = split.category_name || 'Uncategorized';
          ytdCategorySpend[catName] = (ytdCategorySpend[catName] || 0) + Math.abs(split.amount || 0);
        });
      } else {
        // Fallback: if no splits, use total_amount as Uncategorized
        ytdCategorySpend['Uncategorized'] = (ytdCategorySpend['Uncategorized'] || 0) + Math.abs(t.total_amount || 0);
      }
    });

    const categoryBreakdown: Record<
      string,
      {
        monthly_budget: number;
        monthly_spent: number;
        ytd_spent: number;
        category_type: 'monthly_expense' | 'accumulation' | 'target_balance';
        annual_target?: number;
        current_balance: number;
      }
    > = {};

    categories?.forEach((cat: any) => {
      const categoryType = (cat.category_type as 'monthly_expense' | 'accumulation' | 'target_balance') || 'monthly_expense';
      categoryBreakdown[cat.name] = {
        monthly_budget: cat.monthly_amount || 0,
        monthly_spent: monthCategorySpend[cat.name] || 0,
        ytd_spent: ytdCategorySpend[cat.name] || 0,
        category_type: categoryType,
        annual_target: cat.annual_target || undefined,
        current_balance: cat.current_balance || 0,
      };
    });

    // Get goals
    // SECURITY: Filtered by account_id = accountId
    const { data: goals } = await supabase
      .from('goals')
      .select('name, target_amount, current_amount, status')
      .eq('account_id', accountId)
      .in('status', ['active', 'in_progress']);

    // Get accounts (checking, savings, cash)
    // SECURITY: Filtered by account_id = accountId
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, balance, account_type')
      .eq('account_id', accountId)
      .order('sort_order', { ascending: true });

    // Get credit cards
    // SECURITY: Filtered by account_id = accountId
    const { data: creditCards } = await supabase
      .from('credit_cards')
      .select('id, name, current_balance, credit_limit, available_credit')
      .eq('account_id', accountId)
      .order('sort_order', { ascending: true });

    // Get loans
    // SECURITY: Filtered by account_id = accountId
    const { data: loans } = await supabase
      .from('loans')
      .select('id, name, balance, interest_rate, minimum_payment, payment_due_date')
      .eq('account_id', accountId)
      .order('sort_order', { ascending: true });

    // Get income buffer category
    // SECURITY: Filtered by account_id = accountId
    const { data: incomeBufferCategory } = await supabase
      .from('categories')
      .select('id, name, current_balance, monthly_amount')
      .eq('account_id', accountId)
      .eq('is_buffer', true)
      .single();

    // Get income settings
    // SECURITY: Filtered by account_id = accountId
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .eq('account_id', accountId)
      .in('key', [
        'annual_income',
        'annual_salary', // Keep for backwards compatibility
        'tax_rate',
        'pay_frequency',
        'include_extra_paychecks',
        'pre_tax_deduction_items'
      ]);

    // Track metadata about accessed data
    const transactionCount = transactions?.length || 0;
    const transactionTotal = transactions?.reduce((sum, t) => sum + Math.abs(t.total_amount || 0), 0) || 0;
    const ytdTransactionCount = ytdTransactions?.length || 0;
    const ytdTransactionTotal = ytdTransactions?.reduce((sum, t) => sum + Math.abs(t.total_amount || 0), 0) || 0;
    const categoriesSearched = categories?.length || 0;
    const goalsAccessed = goals?.length || 0;
    const accountsAccessed = accounts?.length || 0;
    const creditCardsAccessed = creditCards?.length || 0;
    const loansAccessed = loans?.length || 0;
    const incomeBufferAccessed = !!incomeBufferCategory;
    const incomeSettingsAccessed = (settings?.length || 0) > 0;

    // Get previous month data
    // SECURITY: Filtered by budget_account_id = accountId
    const prevMonth = new Date(year, monthNum - 2, 1);
    const prevMonthEnd = new Date(year, monthNum - 1, 0);

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('id, total_amount')
      .eq('budget_account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', prevMonth.toISOString().split('T')[0])
      .lte('date', prevMonthEnd.toISOString().split('T')[0]);

    // Get splits for previous month transactions
    const prevTransactionIds = (prevTransactions || []).map((t: any) => t.id);
    let prevSplitsByTransaction: Map<number, Array<{ category_name: string; amount: number }>> = new Map();
    if (prevTransactionIds.length > 0) {
      const { data: prevSplits } = await supabase
        .from('transaction_splits')
        .select(`
          transaction_id,
          amount,
          categories (
            name
          )
        `)
        .in('transaction_id', prevTransactionIds);

      if (prevSplits) {
        prevSplits.forEach((split: any) => {
          if (!prevSplitsByTransaction.has(split.transaction_id)) {
            prevSplitsByTransaction.set(split.transaction_id, []);
          }
          prevSplitsByTransaction.get(split.transaction_id)!.push({
            category_name: split.categories?.name || 'Uncategorized',
            amount: split.amount || 0,
          });
        });
      }
    }

    const prevCategoryBreakdown: Record<string, number> = {};
    prevTransactions?.forEach((t: any) => {
      const splits = prevSplitsByTransaction.get(t.id) || [];
      if (splits.length > 0) {
        splits.forEach((split) => {
          const catName = split.category_name || 'Uncategorized';
          prevCategoryBreakdown[catName] = (prevCategoryBreakdown[catName] || 0) + Math.abs(split.amount || 0);
        });
      } else {
        // Fallback: if no splits, use total_amount as Uncategorized
        prevCategoryBreakdown['Uncategorized'] = (prevCategoryBreakdown['Uncategorized'] || 0) + Math.abs(t.total_amount || 0);
      }
    });

    const prevTotal = prevTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;

    const totalBudget = categories?.reduce((sum, cat) => sum + (cat.monthly_amount || 0), 0) || 0;
    const totalSpent = Object.values(monthCategorySpend).reduce((sum, amt) => sum + amt, 0);
    const totalYtdSpent = Object.values(ytdCategorySpend).reduce((sum, amt) => sum + amt, 0);

    // Generate insights
    // Map transactions to only essential fields for AI context
    const mapTransaction = (t: any) => {
      // Determine account name from account_id or credit_card_id
      const accountName = t.account_id 
        ? (t.accounts as any)?.name || 'Unknown Account'
        : t.credit_card_id 
          ? (t.credit_cards as any)?.name || 'Unknown Credit Card'
          : 'Unknown';
      
      // Get merchant name from merchant_groups or use description
      const merchantName = (t.merchant_groups as any)?.display_name || t.description || 'Unknown';
      
      // Get category from splits (use first split's category, or 'Uncategorized' if no splits)
      const splits = splitsByTransaction.get(t.id) || [];
      const category = splits.length > 0 ? splits[0].category_name : 'Uncategorized';
      
      return {
        date: t.date,
        merchant: merchantName,
        amount: Math.abs(t.total_amount || 0),
        type: t.transaction_type || 'expense', // 'income' or 'expense'
        category: category,
        account: accountName,
      };
    };

    const result = await geminiService.generateInsights({
      transactions: (transactions || []).map(mapTransaction),
      ytdTransactions: (ytdTransactions || []).map(mapTransaction),
      budget: {
        total: totalBudget,
        spent: totalSpent,
        remaining: totalBudget - totalSpent,
        ytdSpent: totalYtdSpent,
        period: {
          monthStart,
          monthEnd,
          yearStart,
        },
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
      accounts: (accounts || []).map((a) => ({
        name: a.name || 'Unknown Account',
        balance: a.balance || 0,
        account_type: a.account_type,
      })),
      creditCards: (creditCards || []).map((cc) => ({
        name: cc.name,
        current_balance: cc.current_balance || 0,
        credit_limit: cc.credit_limit || 0,
        available_credit: cc.available_credit || 0,
      })),
      loans: (loans || []).map((l) => ({
        name: l.name,
        balance: l.balance || 0,
        interest_rate: l.interest_rate,
        minimum_payment: l.minimum_payment,
        payment_due_date: l.payment_due_date,
      })),
      incomeBuffer: incomeBufferCategory ? {
        name: incomeBufferCategory.name,
        current_balance: incomeBufferCategory.current_balance || 0,
        monthly_amount: incomeBufferCategory.monthly_amount || 0,
      } : null,
      incomeSettings: settings && settings.length > 0 ? {
        annual_income: settings.find(s => s.key === 'annual_income' || s.key === 'annual_salary')?.value ? parseFloat(settings.find(s => s.key === 'annual_income' || s.key === 'annual_salary')!.value) : null,
        tax_rate: settings.find(s => s.key === 'tax_rate')?.value ? parseFloat(settings.find(s => s.key === 'tax_rate')!.value) : null,
        pay_frequency: settings.find(s => s.key === 'pay_frequency')?.value || null,
        include_extra_paychecks: settings.find(s => s.key === 'include_extra_paychecks')?.value === 'true' ? true : (settings.find(s => s.key === 'include_extra_paychecks')?.value === 'false' ? false : null),
      } : null,
    });

    // Add metadata to insights
    const insightsWithMetadata = {
      ...result.insights,
      metadata: {
        transactionCount,
        transactionTotal,
        ytdTransactionCount,
        ytdTransactionTotal,
        dateRange: {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0],
        },
        ytdDateRange: {
          start: yearStart,
          end: monthEnd,
        },
        categoriesSearched,
        goalsAccessed,
        accountsAccessed,
        creditCardsAccessed,
        loansAccessed,
        incomeBufferAccessed,
        incomeSettingsAccessed,
      },
    };

    // Cache insights for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: insertedInsight, error: insertError } = await supabase
      .from('ai_insights_cache')
      .insert({
        user_id: user.id,
        account_id: accountId,
        insight_type: 'monthly',
        period_start: startOfMonth.toISOString().split('T')[0],
        period_end: endOfMonth.toISOString().split('T')[0],
        insights: insightsWithMetadata,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, feedback, feedback_at')
      .single();

    if (insertError) {
      throw new Error(`Failed to cache insights: ${insertError.message}`);
    }

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
      insightId: insertedInsight.id,
      feedback: insertedInsight.feedback,
      feedbackAt: insertedInsight.feedback_at,
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

