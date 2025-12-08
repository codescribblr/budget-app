import { createClient } from '../supabase/server';
import { getActiveAccountId } from '../account-context';
import type { UserContext } from './types';

/**
 * Build user context for AI features
 * Enhanced to include merchant groups, transaction splits, and more comprehensive data
 */
export async function buildUserContext(userId: string, dateRange?: { start: string; end: string }): Promise<UserContext> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();

  if (!accountId) {
    throw new Error('No active account');
  }

  const now = new Date();
  
  // Determine date range - default to last 3 months for comprehensive context
  let startDate: Date;
  let endDate: Date;
  
  if (dateRange) {
    startDate = new Date(dateRange.start);
    endDate = new Date(dateRange.end);
  } else {
    // Default: last 3 months to current month
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Get transactions with merchant groups and splits
  // SECURITY: Filtered by budget_account_id = accountId
  // Note: dates are stored as TEXT in YYYY-MM-DD format
  // Note: Categories are linked through transaction_splits, so we fetch them separately
  // Note: Merchant comes from merchant_groups, not a direct column
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
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
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: false })
    .limit(500); // Increased limit for better context

  if (txError) {
    console.error('Error fetching transactions:', txError);
  }
  
  // Debug logging
  console.log(`[AI Context] Fetched ${transactions?.length || 0} transactions for date range ${startDateStr} to ${endDateStr}`);

  // Get transaction splits with categories
  const transactionIds = (transactions || []).map((t: any) => t.id);
  let splitsByTransaction: Map<number, Array<{ category_name: string; amount: number }>> = new Map();
  
  if (transactionIds.length > 0) {
    const { data: splits, error: splitsError } = await supabase
      .from('transaction_splits')
      .select(`
        transaction_id,
        amount,
        categories (
          name
        )
      `)
      .in('transaction_id', transactionIds);

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

  // Get budget categories with type information
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, monthly_amount, current_balance, category_type, annual_target, target_balance')
    .eq('account_id', accountId)
    .eq('is_goal', false);

  const totalBudget = categories?.reduce((sum, cat) => sum + (cat.monthly_amount || 0), 0) || 0;
  const totalSpent = categories?.reduce((sum, cat) => sum + Math.abs(cat.current_balance || 0), 0) || 0;

  // Get category totals
  const categoryTotals: Record<string, number> = {};
  categories?.forEach((cat) => {
    categoryTotals[cat.name] = Math.abs(cat.current_balance || 0);
  });

  // Get all goals with linked entities to calculate current_amount
  const { data: goals } = await supabase
    .from('goals')
    .select(`
      id,
      name,
      target_amount,
      target_date,
      status,
      goal_type,
      monthly_contribution,
      linked_category_id,
      linked_account_id,
      notes,
      linked_category:categories!goals_linked_category_id_fkey(current_balance),
      linked_account:accounts!goals_linked_account_id_fkey(balance)
    `)
    .eq('account_id', accountId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  // Get bank accounts (checking, savings, cash)
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, balance, account_type')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  // Get loans
  const { data: loans } = await supabase
    .from('loans')
    .select('id, name, balance, interest_rate, minimum_payment, payment_due_date')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  // Get income buffer category
  const { data: incomeBufferCategory } = await supabase
    .from('categories')
    .select('id, name, current_balance, monthly_amount')
    .eq('account_id', accountId)
    .eq('is_buffer', true)
    .single();

  // Get income settings
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

  // Parse income settings
  const settingsMap: Record<string, string> = {};
  settings?.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  // Parse pre-tax deduction items
  let preTaxDeductionItems: Array<{ id: string; name: string; type: 'percentage' | 'fixed'; value: number }> | null = null;
  if (settingsMap['pre_tax_deduction_items']) {
    try {
      preTaxDeductionItems = JSON.parse(settingsMap['pre_tax_deduction_items']);
    } catch (e) {
      console.error('Error parsing pre_tax_deduction_items:', e);
    }
  }

  // Calculate monthly spending trend (last 6 months)
  const monthlySpending: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const { data: monthTransactions } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('budget_account_id', accountId)
      .eq('transaction_type', 'expense')
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0]);

    const monthTotal = monthTransactions?.reduce((sum, t) => sum + Math.abs(t.total_amount || 0), 0) || 0;
    monthlySpending.push(monthTotal);
  }

  // Build transaction list with merchant groups and categories
  // Extract merchant name from description (first part before common separators)
  const extractMerchantFromDescription = (description: string): string => {
    if (!description) return 'Unknown';
    // Common patterns: "MERCHANT NAME #1234" or "MERCHANT NAME 1234" or "MERCHANT NAME"
    const parts = description.split(/[#\s]{2,}/);
    return parts[0]?.trim() || description.trim().split(/\s+/).slice(0, 2).join(' ') || 'Unknown';
  };

  const recentTransactions = (transactions || []).map((t: any) => {
    const splits = splitsByTransaction.get(t.id) || [];
    // Use primary category from splits, or fallback to first split category
    const primaryCategory = splits.length > 0 ? splits[0].category_name : 'Uncategorized';
    const merchantGroup = (t.merchant_groups as any)?.display_name || null;
    // Use merchant group display_name if available, otherwise extract from description
    const merchant = merchantGroup || extractMerchantFromDescription(t.description || '');

    return {
      id: t.id,
      merchant: merchant,
      merchantGroup: merchantGroup,
      amount: Math.abs(t.total_amount || 0),
      date: t.date,
      category: primaryCategory,
      description: t.description || '',
      transactionType: (t.transaction_type || 'expense') as 'income' | 'expense',
    };
  });

  return {
    currentBudget: {
      total: totalBudget,
      spent: totalSpent,
      remaining: totalBudget - totalSpent,
    },
    recentTransactions,
    categoryTotals,
    categories: (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      monthly_amount: cat.monthly_amount || 0,
      current_balance: cat.current_balance || 0,
      category_type: cat.category_type || 'monthly_expense',
      annual_target: cat.annual_target || undefined,
      target_balance: cat.target_balance || undefined,
    })),
    monthlySpending,
    goals: (goals || []).map((g: any) => {
      // Calculate current_amount based on goal type
      let current_amount = 0;
      if (g.goal_type === 'envelope' && g.linked_category) {
        current_amount = g.linked_category.current_balance || 0;
      } else if (g.goal_type === 'account-linked' && g.linked_account) {
        current_amount = g.linked_account.balance || 0;
      }
      // Note: debt-paydown goals would need linked_credit_card or linked_loan,
      // but those aren't included in this query for simplicity
      
      return {
        id: g.id,
        name: g.name,
        target_amount: g.target_amount,
        target_date: g.target_date,
        current_amount: current_amount,
        status: g.status,
        goal_type: g.goal_type,
        monthly_contribution: g.monthly_contribution || 0,
        notes: g.notes,
      };
    }),
    accounts: (accounts || []).map((a) => ({
      id: a.id,
      name: a.name || 'Unknown Account',
      balance: a.balance || 0,
    })),
    loans: (loans || []).map((l) => ({
      id: l.id,
      name: l.name,
      balance: l.balance || 0,
      interest_rate: l.interest_rate,
      minimum_payment: l.minimum_payment,
      payment_due_date: l.payment_due_date,
    })),
    incomeBuffer: incomeBufferCategory ? {
      id: incomeBufferCategory.id,
      name: incomeBufferCategory.name,
      current_balance: incomeBufferCategory.current_balance || 0,
      monthly_amount: incomeBufferCategory.monthly_amount || 0,
    } : null,
    incomeSettings: {
      annual_income: settingsMap['annual_income'] ? parseFloat(settingsMap['annual_income']) : (settingsMap['annual_salary'] ? parseFloat(settingsMap['annual_salary']) : null),
      tax_rate: settingsMap['tax_rate'] ? parseFloat(settingsMap['tax_rate']) : null,
      pay_frequency: settingsMap['pay_frequency'] || null,
      include_extra_paychecks: settingsMap['include_extra_paychecks'] === 'true' ? true : (settingsMap['include_extra_paychecks'] === 'false' ? false : null),
      pre_tax_deduction_items: preTaxDeductionItems,
    },
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
  };
}

