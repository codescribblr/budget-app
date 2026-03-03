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

  // Get transaction splits with categories (include is_system, is_archived to exclude from insights)
  type SplitWithCategory = { category_name: string; amount: number; is_system?: boolean; is_archived?: boolean };
  const transactionIds = (transactions || []).map((t: any) => t.id);
  let splitsByTransaction: Map<number, Array<SplitWithCategory>> = new Map();

  if (transactionIds.length > 0) {
    const { data: splits, error: splitsError } = await supabase
      .from('transaction_splits')
      .select(`
        transaction_id,
        amount,
        categories (
          name,
          is_system,
          is_archived
        )
      `)
      .in('transaction_id', transactionIds);

    if (!splitsError && splits) {
      splits.forEach((split: any) => {
        if (!splitsByTransaction.has(split.transaction_id)) {
          splitsByTransaction.set(split.transaction_id, []);
        }
        const cat = split.categories;
        splitsByTransaction.get(split.transaction_id)!.push({
          category_name: cat?.name || 'Uncategorized',
          amount: split.amount || 0,
          is_system: cat?.is_system ?? false,
          is_archived: cat?.is_archived ?? false,
        });
      });
    }
  }

  const isUserCategory = (s: SplitWithCategory) => !s.is_system && !s.is_archived;
  const userSplitsOnly = (splits: SplitWithCategory[]) => splits.filter(isUserCategory);

  // Get budget categories: exclude system, archived, buffer so context reflects user-managed categories only
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, monthly_amount, current_balance, category_type, annual_target, target_balance')
    .eq('account_id', accountId)
    .eq('is_goal', false)
    .eq('is_system', false)
    .eq('is_archived', false)
    .eq('is_buffer', false);

  const totalBudget = categories?.reduce((sum, cat) => sum + (cat.monthly_amount || 0), 0) || 0;
  const totalSpent = categories?.reduce((sum, cat) => sum + Math.abs(cat.current_balance || 0), 0) || 0;

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

  // Get loans (linked_asset_name filled below from nonCashAssets)
  const { data: loans } = await supabase
    .from('loans')
    .select('id, name, balance, interest_rate, minimum_payment, payment_due_date, linked_non_cash_asset_id')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  // Get credit cards (for net worth / debt context in chat)
  const { data: creditCards } = await supabase
    .from('credit_cards')
    .select('id, name, current_balance, credit_limit, available_credit')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  // Get tags for the account (for transaction tagging context)
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('account_id', accountId)
    .order('name', { ascending: true });

  // Get transaction_tags for our transaction set (to attach tag names to transactions)
  let transactionTagsMap: Map<number, string[]> = new Map();
  if (transactionIds.length > 0 && tags && tags.length > 0) {
    const tagIds = tags.map((t: any) => t.id);
    const { data: txTags } = await supabase
      .from('transaction_tags')
      .select('transaction_id, tag_id')
      .in('transaction_id', transactionIds)
      .in('tag_id', tagIds);
    const tagNameById = Object.fromEntries((tags || []).map((t: any) => [t.id, t.name]));
    txTags?.forEach((tt: any) => {
      const name = tagNameById[tt.tag_id];
      if (name) {
        if (!transactionTagsMap.has(tt.transaction_id)) transactionTagsMap.set(tt.transaction_id, []);
        transactionTagsMap.get(tt.transaction_id)!.push(name);
      }
    });
  }

  // Get non-cash assets (with RMD/liquidity/return for retirement and net worth context)
  const { data: nonCashAssets } = await supabase
    .from('non_cash_assets')
    .select('id, name, asset_type, current_value, estimated_return_percentage, is_rmd_qualified, is_liquid')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  // Get income buffer category
  const { data: incomeBufferCategory } = await supabase
    .from('categories')
    .select('id, name, current_balance, monthly_amount')
    .eq('account_id', accountId)
    .eq('is_buffer', true)
    .single();

  // Build asset id -> name for linking (loans, income streams)
  const assetNameById = new Map<number, string>();
  (nonCashAssets || []).forEach((a: any) => assetNameById.set(a.id, a.name || ''));

  // Retirement/forecast: user profile (birth year) and forecast settings
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('birth_year')
    .eq('user_id', userId)
    .single();

  const { data: forecastSettingsRow } = await supabase
    .from('forecast_settings')
    .select('settings')
    .eq('user_id', userId)
    .single();

  const forecastDefaults = {
    forecast_age: 90,
    income_growth_rate: 3,
    savings_rate: 20,
    retirement_savings_rate: 0,
    retirement_age: 67,
    social_security_start_age: 67,
    social_security_benefit_level: 'full' as const,
    other_retirement_income: 0,
    inflation_rate: 4,
    rmd_age: 73,
    distribution_type: 'amount' as const,
    distribution_amount: 0,
    distribution_increase_rate: 0,
    repeatable_events: [] as any[],
    timeline_events: [] as any[],
  };
  const forecastSettings = forecastSettingsRow?.settings
    ? { ...forecastDefaults, ...(forecastSettingsRow.settings as object) }
    : null;

  // Net worth snapshots (recent history for chat suggestions/predictions)
  const { data: netWorthSnapshots } = await supabase
    .from('net_worth_snapshots')
    .select('snapshot_date, total_accounts, total_credit_cards, total_loans, total_assets, net_worth')
    .eq('budget_account_id', accountId)
    .order('snapshot_date', { ascending: false })
    .limit(24);

  // Get income - prefer income streams, fallback to legacy settings
  let incomeSettings: UserContext['incomeSettings'] = {
    annual_income: null,
    tax_rate: null,
    pay_frequency: null,
    include_extra_paychecks: null,
    pre_tax_deduction_items: null,
  };

  const { data: incomeStreamRows } = await supabase
    .from('income_streams')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  if (incomeStreamRows && incomeStreamRows.length > 0) {
    const { calculateAggregateMonthlyNetIncome } = await import('../income-calculations');
    const streams = incomeStreamRows.map((row: any) => {
      let items: any[] = [];
      if (row.pre_tax_deduction_items) {
        try {
          items = typeof row.pre_tax_deduction_items === 'string'
            ? JSON.parse(row.pre_tax_deduction_items)
            : row.pre_tax_deduction_items;
        } catch { items = []; }
      }
      return {
        ...row,
        annual_income: Number(row.annual_income),
        tax_rate: Number(row.tax_rate),
        include_in_budget: row.include_in_budget ?? true,
        pre_tax_deduction_items: items,
      };
    });
    const aggregateAnnual = streams
      .filter((s: any) => s.include_in_budget)
      .reduce((sum: number, s: any) => sum + s.annual_income, 0);
    const monthlyNet = calculateAggregateMonthlyNetIncome(streams);
    incomeSettings = {
      annual_income: aggregateAnnual || null,
      tax_rate: streams.length === 1 ? streams[0].tax_rate : null,
      pay_frequency: streams.length === 1 ? streams[0].pay_frequency : null,
      include_extra_paychecks: streams.length === 1 ? streams[0].include_extra_paychecks : null,
      pre_tax_deduction_items: streams.length === 1 ? streams[0].pre_tax_deduction_items : null,
    };
  }

  // Detailed income streams for chat (with linked asset names for retirement context)
  const incomeStreamsDetail: UserContext['incomeStreamsDetail'] = (incomeStreamRows || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    annual_income: Number(row.annual_income) || 0,
    tax_rate: Number(row.tax_rate) || 0,
    pay_frequency: row.pay_frequency || 'monthly',
    include_in_budget: row.include_in_budget ?? true,
    linked_asset_name: row.linked_non_cash_asset_id != null ? assetNameById.get(row.linked_non_cash_asset_id) ?? null : null,
  }));

  if (!(incomeStreamRows && incomeStreamRows.length > 0)) {
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .eq('account_id', accountId)
      .in('key', [
        'annual_income',
        'annual_salary',
        'tax_rate',
        'pay_frequency',
        'include_extra_paychecks',
        'pre_tax_deduction_items'
      ]);
    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });
    let preTaxDeductionItems: Array<{ id: string; name: string; type: 'percentage' | 'fixed'; value: number }> | null = null;
    if (settingsMap['pre_tax_deduction_items']) {
      try {
        preTaxDeductionItems = JSON.parse(settingsMap['pre_tax_deduction_items']);
      } catch (e) { /* ignore */ }
    }
    incomeSettings = {
      annual_income: settingsMap['annual_income'] ? parseFloat(settingsMap['annual_income']) : (settingsMap['annual_salary'] ? parseFloat(settingsMap['annual_salary']) : null),
      tax_rate: settingsMap['tax_rate'] ? parseFloat(settingsMap['tax_rate']) : null,
      pay_frequency: settingsMap['pay_frequency'] || null,
      include_extra_paychecks: settingsMap['include_extra_paychecks'] === 'true' ? true : (settingsMap['include_extra_paychecks'] === 'false' ? false : null),
      pre_tax_deduction_items: preTaxDeductionItems,
    };
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

  // Only include transactions that have at least one user (non-system, non-archived) split, or no splits
  const recentTransactions = (transactions || [])
    .filter((t: any) => {
      const splits = splitsByTransaction.get(t.id) || [];
      return userSplitsOnly(splits).length > 0 || splits.length === 0;
    })
    .map((t: any) => {
      const splits = splitsByTransaction.get(t.id) || [];
      const userSplits = userSplitsOnly(splits);
      const primaryCategory = userSplits.length > 0 ? userSplits[0].category_name : (splits[0]?.category_name || 'Uncategorized');
      const amount = userSplits.length > 0
        ? userSplits.reduce((sum, s) => sum + Math.abs(s.amount || 0), 0)
        : Math.abs(t.total_amount || 0);
      const merchantGroup = (t.merchant_groups as any)?.display_name || null;
      const merchant = merchantGroup || extractMerchantFromDescription(t.description || '');

      return {
        id: t.id,
        merchant,
        merchantGroup,
        amount,
        date: t.date,
        category: primaryCategory,
        description: t.description || '',
        transactionType: (t.transaction_type || 'expense') as 'income' | 'expense',
        tags: transactionTagsMap.get(t.id) || [],
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
    loans: (loans || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      balance: l.balance || 0,
      interest_rate: l.interest_rate,
      minimum_payment: l.minimum_payment,
      payment_due_date: l.payment_due_date,
      linked_asset_name: l.linked_non_cash_asset_id != null ? assetNameById.get(l.linked_non_cash_asset_id) ?? null : null,
    })),
    creditCards: (creditCards || []).map((cc) => ({
      id: cc.id,
      name: cc.name,
      current_balance: cc.current_balance || 0,
      credit_limit: cc.credit_limit || 0,
      available_credit: cc.available_credit || 0,
    })),
    tags: (tags || []).map((t: any) => ({ id: t.id, name: t.name })),
    nonCashAssets: (nonCashAssets || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      asset_type: a.asset_type,
      current_value: Number(a.current_value) || 0,
      estimated_return_percentage: a.estimated_return_percentage != null ? Number(a.estimated_return_percentage) : undefined,
      is_rmd_qualified: a.is_rmd_qualified ?? undefined,
      is_liquid: a.is_liquid ?? undefined,
    })),
    incomeStreamsDetail: incomeStreamsDetail.length > 0 ? incomeStreamsDetail : undefined,
    retirementForecast: forecastSettings
      ? {
          birth_year: userProfile?.birth_year ?? null,
          forecast_age: forecastSettings.forecast_age ?? forecastDefaults.forecast_age,
          retirement_age: forecastSettings.retirement_age ?? forecastDefaults.retirement_age,
          income_growth_rate: forecastSettings.income_growth_rate ?? forecastDefaults.income_growth_rate,
          savings_rate: forecastSettings.savings_rate ?? forecastDefaults.savings_rate,
          retirement_savings_rate: forecastSettings.retirement_savings_rate ?? forecastDefaults.retirement_savings_rate,
          social_security_start_age: forecastSettings.social_security_start_age ?? forecastDefaults.social_security_start_age,
          social_security_benefit_level: (forecastSettings.social_security_benefit_level ?? forecastDefaults.social_security_benefit_level) as 'full' | 'half' | 'none',
          other_retirement_income: forecastSettings.other_retirement_income ?? forecastDefaults.other_retirement_income,
          inflation_rate: forecastSettings.inflation_rate ?? forecastDefaults.inflation_rate,
          rmd_age: forecastSettings.rmd_age ?? forecastDefaults.rmd_age,
          distribution_type: forecastSettings.distribution_type ?? forecastDefaults.distribution_type,
          distribution_amount: forecastSettings.distribution_amount ?? forecastDefaults.distribution_amount,
          distribution_increase_rate: forecastSettings.distribution_increase_rate ?? forecastDefaults.distribution_increase_rate,
          repeatable_events: forecastSettings.repeatable_events ?? forecastDefaults.repeatable_events,
          timeline_events: forecastSettings.timeline_events ?? forecastDefaults.timeline_events,
        }
      : null,
    netWorthSnapshots: (netWorthSnapshots || []).map((s: any) => ({
      snapshot_date: s.snapshot_date,
      total_accounts: Number(s.total_accounts) || 0,
      total_credit_cards: Number(s.total_credit_cards) || 0,
      total_loans: Number(s.total_loans) || 0,
      total_assets: Number(s.total_assets) || 0,
      net_worth: Number(s.net_worth) || 0,
    })),
    incomeBuffer: incomeBufferCategory ? {
      id: incomeBufferCategory.id,
      name: incomeBufferCategory.name,
      current_balance: incomeBufferCategory.current_balance || 0,
      monthly_amount: incomeBufferCategory.monthly_amount || 0,
    } : null,
    incomeSettings,
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
  };
}


