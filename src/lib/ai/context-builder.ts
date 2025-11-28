import { createClient } from '../supabase/server';
import { getActiveAccountId } from '../account-context';
import type { UserContext } from './types';

/**
 * Build user context for AI features
 */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();

  if (!accountId) {
    throw new Error('No active account');
  }

  // Get current month transactions
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get transactions for current month
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, merchant, total_amount, date, categories(name)')
    .eq('account_id', accountId)
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(100);

  // Get budget
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, monthly_amount, current_balance')
    .eq('account_id', accountId)
    .eq('is_goal', false);

  const totalBudget = categories?.reduce((sum, cat) => sum + (cat.monthly_amount || 0), 0) || 0;
  const totalSpent = categories?.reduce((sum, cat) => sum + Math.abs(cat.current_balance || 0), 0) || 0;

  // Get category totals
  const categoryTotals: Record<string, number> = {};
  categories?.forEach((cat) => {
    categoryTotals[cat.name] = Math.abs(cat.current_balance || 0);
  });

  // Get goals
  const { data: goals } = await supabase
    .from('goals')
    .select('id, name, target_amount, current_amount, status')
    .eq('account_id', accountId)
    .in('status', ['active', 'in_progress']);

  // Get accounts
  const { data: accounts } = await supabase
    .from('budget_accounts')
    .select('id, name')
    .eq('id', accountId)
    .limit(1);

  // Calculate monthly spending trend (last 6 months)
  const monthlySpending: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const { data: monthTransactions } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0]);

    const monthTotal = monthTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
    monthlySpending.push(monthTotal);
  }

  return {
    currentBudget: {
      total: totalBudget,
      spent: totalSpent,
      remaining: totalBudget - totalSpent,
    },
    recentTransactions: (transactions || []).slice(0, 30).map((t) => ({
      id: t.id,
      merchant: t.merchant || 'Unknown',
      amount: t.total_amount || 0,
      date: t.date,
      category: (t.categories as any)?.name || 'Uncategorized',
    })),
    categoryTotals,
    monthlySpending,
    goals: (goals || []).map((g) => ({
      id: g.id,
      name: g.name,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      status: g.status,
    })),
    accounts: (accounts || []).map((a) => ({
      id: a.id,
      name: a.name || 'My Budget',
      balance: 0, // Could calculate from transactions if needed
    })),
  };
}

