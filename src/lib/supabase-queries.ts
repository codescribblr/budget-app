import { createClient } from './supabase/server';
import type {
  Category,
  Account,
  CreditCard,
  Loan,
  NonCashAsset,
  Transaction,
  TransactionSplit,
  PendingCheck,
  TransactionWithSplits,
  DashboardSummary,
  Goal,
  GoalWithDetails,
  CreateGoalRequest,
  UpdateGoalRequest,
} from './types';
import { calculateGoalProgress, calculateGoalStatus } from './goals/calculations';
import { getActiveAccountId } from './account-context';
import { cache } from 'react';
import { logBalanceChange, logBalanceChanges } from './audit/category-balance-audit';

// =====================================================
// HELPER: Get authenticated user
// =====================================================
// Cache the authenticated user per request to avoid repeated auth calls
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { supabase, user };
});

// =====================================================
// CATEGORIES
// =====================================================

export type IncludeArchivedMode = 'none' | 'all' | 'only';

export async function getAllCategories(
  excludeGoals: boolean = false,
  includeArchived: IncludeArchivedMode = 'none'
): Promise<Category[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    // Return empty array instead of throwing - allows UI to handle gracefully
    console.warn('No active account found for getAllCategories');
    return [];
  }
  
  let query = supabase
    .from('categories')
    .select('*')
    .eq('account_id', accountId);
  
  // Exclude goal categories when fetching for transactions
  if (excludeGoals) {
    query = query.eq('is_goal', false);
  }

  // Archived filtering
  if (includeArchived === 'none') {
    // Include categories where is_archived is false or null (for backwards compatibility)
    query = query.or('is_archived.is.null,is_archived.eq.false');
  } else if (includeArchived === 'only') {
    query = query.eq('is_archived', true);
  }
  // If includeArchived === 'all', don't filter by archived status
  
  const { data, error } = await query.order('sort_order');
  
  if (error) {
    // If error is about column not existing, try without archived filter
    const errorMessage = error.message || '';
    const errorCode = (error as any).code || '';
    if (errorMessage.includes('is_archived') || errorCode === '42703' || errorCode === 'PGRST116' || errorMessage.includes('column') && errorMessage.includes('is_archived')) {
      console.warn('is_archived column not found, fetching all categories without archived filter');
      let fallbackQuery = supabase
        .from('categories')
        .select('*')
        .eq('account_id', accountId);
      if (excludeGoals) {
        fallbackQuery = fallbackQuery.eq('is_goal', false);
      }
      const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('sort_order');
      if (fallbackError) throw fallbackError;
      return fallbackData as Category[];
    }
    throw error;
  }
  return data as Category[];
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data as Category;
}

export async function createCategory(data: {
  name: string;
  monthly_amount: number;
  current_balance?: number;
  sort_order?: number;
  notes?: string;
  is_system?: boolean;
  is_archived?: boolean;
  category_type?: 'monthly_expense' | 'accumulation' | 'target_balance';
  priority?: number;
  monthly_target?: number;
  annual_target?: number;
  target_balance?: number;
}): Promise<Category> {
  const { supabase, user } = await getAuthenticatedUser();

  // Auto-calculate fields based on category type
  const categoryType = data.category_type ?? 'monthly_expense';
  let monthlyAmount = data.monthly_amount;
  let monthlyTarget = data.monthly_target ?? null;
  let annualTarget = data.annual_target ?? null;
  let targetBalance = data.target_balance ?? null;

  if (categoryType === 'monthly_expense') {
    // For monthly expense, sync monthly_target with monthly_amount
    monthlyTarget = monthlyAmount;
    annualTarget = null;
    targetBalance = null;
  } else if (categoryType === 'accumulation') {
    // For accumulation, calculate monthly_amount from annual_target
    if (data.annual_target) {
      monthlyAmount = data.annual_target / 12;
      annualTarget = data.annual_target;
    }
    monthlyTarget = null;
    targetBalance = null;
  } else if (categoryType === 'target_balance') {
    // For target balance, keep monthly_amount as is (user input or 0)
    monthlyAmount = data.monthly_amount ?? 0;
    monthlyTarget = null;
    annualTarget = null;
    targetBalance = data.target_balance ?? null;
  }

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      account_id: accountId,
      name: data.name,
      monthly_amount: monthlyAmount,
      current_balance: data.current_balance ?? 0,
      sort_order: data.sort_order ?? 0,
      notes: data.notes ?? null,
      is_system: data.is_system ?? false,
      is_archived: data.is_archived ?? false,
      category_type: categoryType,
      priority: data.priority ?? 5,
      monthly_target: monthlyTarget,
      annual_target: annualTarget,
      target_balance: targetBalance,
    })
    .select()
    .single();

  if (error) throw error;
  return category as Category;
}

export async function updateCategory(
  id: number,
  data: Partial<{
    name: string;
    monthly_amount: number;
    current_balance: number;
    sort_order: number;
    notes: string;
    is_system: boolean;
    is_archived: boolean;
    category_type: 'monthly_expense' | 'accumulation' | 'target_balance';
    priority: number;
    monthly_target: number;
    annual_target: number;
    target_balance: number;
  }>
): Promise<Category | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get old balance if current_balance is being updated
  let oldBalance: number | null = null;
  if (data.current_balance !== undefined) {
    const { data: oldCategory } = await supabase
      .from('categories')
      .select('current_balance')
      .eq('id', id)
      .eq('account_id', accountId)
      .single();
    oldBalance = oldCategory?.current_balance ?? 0;
  }

  const updateData: any = { updated_at: new Date().toISOString() };

  // Auto-calculate fields based on category type
  const categoryType = data.category_type;

  if (categoryType === 'monthly_expense') {
    // For monthly expense, sync monthly_target with monthly_amount
    if (data.monthly_amount !== undefined) {
      updateData.monthly_amount = data.monthly_amount;
      updateData.monthly_target = data.monthly_amount;
    }
    updateData.annual_target = null;
    updateData.target_balance = null;
  } else if (categoryType === 'accumulation') {
    // For accumulation, calculate monthly_amount from annual_target
    if (data.annual_target !== undefined) {
      updateData.annual_target = data.annual_target;
      updateData.monthly_amount = data.annual_target / 12;
    }
    updateData.monthly_target = null;
    updateData.target_balance = null;
  } else if (categoryType === 'target_balance') {
    // For target balance, keep monthly_amount as is
    if (data.monthly_amount !== undefined) {
      updateData.monthly_amount = data.monthly_amount;
    }
    if (data.target_balance !== undefined) {
      updateData.target_balance = data.target_balance;
    }
    updateData.monthly_target = null;
    updateData.annual_target = null;
  } else {
    // No category type specified, update fields as provided
    if (data.monthly_amount !== undefined) updateData.monthly_amount = data.monthly_amount;
    if (data.monthly_target !== undefined) updateData.monthly_target = data.monthly_target;
    if (data.annual_target !== undefined) updateData.annual_target = data.annual_target;
    if (data.target_balance !== undefined) updateData.target_balance = data.target_balance;
  }

  // Update other fields
  if (data.name !== undefined) updateData.name = data.name;
  if (data.current_balance !== undefined) updateData.current_balance = data.current_balance;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.is_system !== undefined) updateData.is_system = data.is_system;
  if (data.is_archived !== undefined) updateData.is_archived = data.is_archived;
  if (data.category_type !== undefined) updateData.category_type = data.category_type;
  if (data.priority !== undefined) updateData.priority = data.priority;

  const { data: category, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Log balance change if current_balance was updated
  if (data.current_balance !== undefined && oldBalance !== null) {
    await logBalanceChange(
      id,
      oldBalance,
      category.current_balance,
      'manual_edit',
      {}
    );
  }

  return category as Category;
}

export async function deleteCategory(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) throw error;
}

export async function setCategoriesArchived(
  categoryIds: number[],
  is_archived: boolean
): Promise<Category[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];

  const { data, error } = await supabase
    .from('categories')
    .update({ is_archived, updated_at: new Date().toISOString() })
    .in('id', categoryIds)
    .eq('account_id', accountId)
    .select('*');

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function updateCategoriesOrder(
  categoryOrders: Array<{ id: number; sort_order: number }>
): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  // Update each category's sort_order
  // Note: Supabase doesn't support batch updates in a single query,
  // so we'll update them individually
  const updatePromises = categoryOrders.map(({ id, sort_order }) =>
    supabase
      .from('categories')
      .update({
        sort_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
  );

  const results = await Promise.all(updatePromises);

  // Check if any updates failed
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    console.error('Failed to update some categories:', errors);
    throw new Error('Failed to update category order');
  }
}

// =====================================================
// ACCOUNTS
// =====================================================

export async function getAllAccounts(): Promise<Account[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('account_id', accountId)
    .order('name');
  
  if (error) throw error;
  return data as Account[];
}

export async function getAccountById(id: number): Promise<Account | null> {
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Account;
}

export async function createAccount(data: {
  name: string;
  balance?: number;
  account_type?: 'checking' | 'savings' | 'cash';
  include_in_totals?: boolean;
  sort_order?: number;
}): Promise<Account> {
  const { supabase, user } = await getAuthenticatedUser();

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      account_id: accountId,
      name: data.name,
      balance: data.balance ?? 0,
      account_type: data.account_type ?? 'checking',
      include_in_totals: data.include_in_totals ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return account as Account;
}

export async function updateAccount(
  id: number,
  data: Partial<{
    name: string;
    balance: number;
    account_type: 'checking' | 'savings' | 'cash';
    include_in_totals: boolean;
    sort_order: number;
  }>
): Promise<Account | null> {
  const { supabase } = await getAuthenticatedUser();
  
  // Get old balance if balance is being updated
  let oldBalance: number | undefined;
  if (data.balance !== undefined) {
    const { data: oldAccount } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', id)
      .single();
    oldBalance = oldAccount?.balance;
  }
  
  const { data: account, error } = await supabase
    .from('accounts')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  // Log balance change if balance was updated
  if (data.balance !== undefined && oldBalance !== undefined && account) {
    const { logAccountBalanceChange } = await import('./audit/account-balance-audit');
    await logAccountBalanceChange(
      id,
      oldBalance,
      account.balance,
      'manual_edit'
    );
    
    // Create net worth snapshot
    const { createNetWorthSnapshot } = await import('./audit/account-balance-audit');
    await createNetWorthSnapshot();
  }
  
  return account as Account;
}

export async function deleteAccount(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// =====================================================
// CREDIT CARDS
// =====================================================

export async function getAllCreditCards(): Promise<CreditCard[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    console.warn('No active account found for getAllCreditCards');
    return [];
  }
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('account_id', accountId)
    .order('name');
  
  if (error) throw error;
  return data as CreditCard[];
}

export async function getCreditCardById(id: number): Promise<CreditCard | null> {
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as CreditCard;
}

export async function createCreditCard(data: {
  name: string;
  credit_limit?: number;
  available_credit?: number;
  include_in_totals?: boolean;
  sort_order?: number;
}): Promise<CreditCard> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const creditLimit = data.credit_limit ?? 0;
  const availableCredit = data.available_credit ?? 0;
  const currentBalance = creditLimit - availableCredit;

  const { data: creditCard, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: user.id,
      account_id: accountId,
      name: data.name,
      credit_limit: creditLimit,
      available_credit: availableCredit,
      current_balance: currentBalance,
      include_in_totals: data.include_in_totals ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return creditCard as CreditCard;
}

export async function updateCreditCard(
  id: number,
  data: Partial<{
    name: string;
    credit_limit: number;
    available_credit: number;
    current_balance: number;
    include_in_totals: boolean;
    sort_order: number;
  }>
): Promise<CreditCard | null> {
  const { supabase } = await getAuthenticatedUser();

  // Get old available_credit if it's being updated
  let oldAvailableCredit: number | undefined;
  if (data.available_credit !== undefined || data.credit_limit !== undefined) {
    const { data: currentCard } = await supabase
      .from('credit_cards')
      .select('credit_limit, available_credit')
      .eq('id', id)
      .single();

    if (currentCard) {
      oldAvailableCredit = currentCard.available_credit;
      
      // If credit_limit or available_credit is being updated, recalculate current_balance
      const creditLimit = data.credit_limit ?? currentCard.credit_limit;
      const availableCredit = data.available_credit ?? currentCard.available_credit;
      data.current_balance = creditLimit - availableCredit;
    }
  }

  const { data: creditCard, error } = await supabase
    .from('credit_cards')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Log available_credit change if it was updated
  if (data.available_credit !== undefined && oldAvailableCredit !== undefined && creditCard) {
    const { logCreditCardBalanceChange } = await import('./audit/account-balance-audit');
    await logCreditCardBalanceChange(
      id,
      oldAvailableCredit,
      creditCard.available_credit,
      'manual_edit'
    );
    
    // Create net worth snapshot
    const { createNetWorthSnapshot } = await import('./audit/account-balance-audit');
    await createNetWorthSnapshot();
  }

  return creditCard as CreditCard;
}

export async function deleteCreditCard(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  
  const { error } = await supabase
    .from('credit_cards')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// =====================================================
// NON-CASH ASSETS
// =====================================================

export async function getAllNonCashAssets(): Promise<NonCashAsset[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    console.warn('No active account found for getAllNonCashAssets');
    return [];
  }

  const { data: assets, error } = await supabase
    .from('non_cash_assets')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (assets || []) as NonCashAsset[];
}

export async function getNonCashAssetById(id: number): Promise<NonCashAsset | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data: asset, error } = await supabase
    .from('non_cash_assets')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return asset as NonCashAsset;
}

export async function createNonCashAsset(data: {
  name: string;
  asset_type: NonCashAsset['asset_type'];
  current_value?: number;
  estimated_return_percentage?: number;
  address?: string | null;
  vin?: string | null;
  is_rmd_qualified?: boolean;
  is_liquid?: boolean;
  sort_order?: number;
}): Promise<NonCashAsset> {
  const { supabase, user } = await getAuthenticatedUser();

  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data: asset, error } = await supabase
    .from('non_cash_assets')
    .insert({
      account_id: accountId,
      name: data.name,
      asset_type: data.asset_type,
      current_value: data.current_value ?? 0,
      estimated_return_percentage: data.estimated_return_percentage ?? 0,
      address: data.address ?? null,
      vin: data.vin ?? null,
      is_rmd_qualified: data.is_rmd_qualified ?? false,
      is_liquid: data.is_liquid ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return asset as NonCashAsset;
}

export async function updateNonCashAsset(
  id: number,
  data: Partial<{
    name: string;
    asset_type: NonCashAsset['asset_type'];
    current_value: number;
    estimated_return_percentage: number;
    address: string | null;
    vin: string | null;
    is_rmd_qualified: boolean;
    is_liquid: boolean;
    sort_order: number;
  }>
): Promise<NonCashAsset | null> {
  const { supabase } = await getAuthenticatedUser();
  
  // Get old value if current_value is being updated
  let oldValue: number | undefined;
  if (data.current_value !== undefined) {
    const { data: oldAsset } = await supabase
      .from('non_cash_assets')
      .select('current_value')
      .eq('id', id)
      .single();
    oldValue = oldAsset?.current_value;
  }
  
  const { data: asset, error } = await supabase
    .from('non_cash_assets')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  // Log value change if current_value was updated
  if (data.current_value !== undefined && oldValue !== undefined && asset) {
    const { logAssetValueChange } = await import('./audit/account-balance-audit');
    await logAssetValueChange(
      id,
      oldValue,
      asset.current_value,
      'manual_edit'
    );
    
    // Create net worth snapshot
    const { createNetWorthSnapshot } = await import('./audit/account-balance-audit');
    await createNetWorthSnapshot();
  }
  
  return asset as NonCashAsset;
}

export async function deleteNonCashAsset(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  
  const { error } = await supabase
    .from('non_cash_assets')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// =====================================================
// LOANS
// =====================================================

export async function getAllLoans(): Promise<Loan[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getLoanById(id: number): Promise<Loan | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function createLoan(loan: {
  name: string;
  balance: number;
  interest_rate?: number;
  minimum_payment?: number;
  payment_due_date?: number;
  open_date?: string;
  maturity_date?: string | null;
  starting_balance?: number;
  institution?: string;
  include_in_net_worth?: boolean;
}): Promise<Loan> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get the max sort_order
  const { data: maxData } = await supabase
    .from('loans')
    .select('sort_order')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = maxData && maxData.length > 0 ? maxData[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('loans')
    .insert({
      user_id: user.id,
      account_id: accountId,
      ...loan,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLoan(
  id: number,
  updates: {
    name?: string;
    balance?: number;
    interest_rate?: number;
    minimum_payment?: number;
    payment_due_date?: number;
    open_date?: string;
    maturity_date?: string | null;
    starting_balance?: number;
    institution?: string;
    include_in_net_worth?: boolean;
  }
): Promise<Loan> {
  const { supabase } = await getAuthenticatedUser();

  // Get old balance if balance is being updated
  let oldBalance: number | undefined;
  if (updates.balance !== undefined) {
    const { data: oldLoan } = await supabase
      .from('loans')
      .select('balance')
      .eq('id', id)
      .single();
    oldBalance = oldLoan?.balance;
  }

  const { data, error } = await supabase
    .from('loans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  // Log balance change if balance was updated
  if (updates.balance !== undefined && oldBalance !== undefined && data) {
    const { logLoanBalanceChange } = await import('./audit/account-balance-audit');
    await logLoanBalanceChange(
      id,
      oldBalance,
      data.balance,
      'manual_edit'
    );
    
    // Create net worth snapshot
    const { createNetWorthSnapshot } = await import('./audit/account-balance-audit');
    await createNetWorthSnapshot();
  }
  
  return data;
}

export async function updateLoansSortOrder(loanIds: number[]): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  // Update each loan's sort_order based on its position in the array
  const updates = loanIds.map((id, index) =>
    supabase
      .from('loans')
      .update({ sort_order: index })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function deleteLoan(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// PENDING CHECKS
// =====================================================

export async function getAllPendingChecks(): Promise<PendingCheck[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    console.warn('No active account found for getAllPendingChecks');
    return [];
  }

  const { data, error } = await supabase
    .from('pending_checks')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PendingCheck[];
}

export async function getPendingCheckById(id: number): Promise<PendingCheck | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('pending_checks')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PendingCheck;
}

export async function createPendingCheck(data: {
  description: string;
  amount: number;
  type?: 'expense' | 'income';
}): Promise<PendingCheck> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data: check, error } = await supabase
    .from('pending_checks')
    .insert({
      user_id: user.id,
      account_id: accountId,
      description: data.description,
      amount: data.amount,
      type: data.type || 'expense',
    })
    .select()
    .single();

  if (error) throw error;
  return check as PendingCheck;
}

export async function updatePendingCheck(
  id: number,
  data: Partial<{
    description: string;
    amount: number;
    type: 'expense' | 'income';
  }>
): Promise<PendingCheck | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data: check, error } = await supabase
    .from('pending_checks')
    .update(data)
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return check as PendingCheck;
}

export async function deletePendingCheck(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('pending_checks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// DASHBOARD
// =====================================================

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    throw new Error('No active account');
  }

  // Get all categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order');

  if (catError) throw catError;

  // Get all accounts
  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('*')
    .eq('account_id', accountId);

  if (accError) throw accError;

  // Get all credit cards
  const { data: creditCards, error: ccError } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('account_id', accountId);

  if (ccError) throw ccError;

  // Get all pending checks
  const { data: pendingChecks, error: pcError } = await supabase
    .from('pending_checks')
    .select('*')
    .eq('account_id', accountId);

  if (pcError) throw pcError;

  // Get settings for income calculation
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .eq('account_id', accountId);

  if (settingsError) throw settingsError;

  // Convert settings array to object
  const settingsObj: Record<string, string> = {};
  settings?.forEach((setting: any) => {
    settingsObj[setting.key] = setting.value;
  });

  // Calculate totals (only include accounts/credit cards with include_in_totals = true)
  const totalMonies = (accounts as Account[])
    .filter(acc => acc.include_in_totals === true)
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  // Filter categories for envelope display (exclude system categories and buffer)
  const envelopeCategories = (categories as Category[]).filter(cat => !cat.is_system && !cat.is_buffer);

  // For totals calculation, include buffer category but exclude other system categories
  // Buffer category is special: doesn't show in lists but DOES count in totals
  const categoriesTotalBalance = (categories as Category[])
    .filter(cat => !cat.is_system || cat.is_buffer)
    .reduce((sum, cat) => sum + Number(cat.current_balance), 0);

  const hasNegativeEnvelopes = (categories as Category[])
    .filter(cat => !cat.is_system || cat.is_buffer)
    .some(cat => Number(cat.current_balance) < 0);

  const totalCreditCardBalances = (creditCards as CreditCard[])
    .filter(cc => cc.include_in_totals === true)
    .reduce((sum, cc) => sum + Number(cc.current_balance), 0);

  // Calculate pending checks total: expenses subtract, income adds
  // Income is positive (adds to available funds), expense is negative (subtracts from available funds)
  const totalPendingChecks = (pendingChecks as PendingCheck[])
    .reduce((sum, pc) => {
      const amount = Number(pc.amount);
      // Income adds to available funds (positive), expenses subtract (negative)
      return sum + (pc.type === 'income' ? amount : -amount);
    }, 0);

  // Add totalPendingChecks (income increases savings, expenses decrease savings)
  const currentSavings = totalMonies - categoriesTotalBalance - totalCreditCardBalances + totalPendingChecks;

  // Calculate total monthly budget (exclude buffer from budget totals)
  const totalMonthlyBudget = envelopeCategories
    .reduce((sum, cat) => sum + Number(cat.monthly_amount), 0);

  // Calculate monthly net income
  const monthlyNetIncome = calculateMonthlyNetIncome(settingsObj);

  return {
    total_monies: totalMonies,
    total_envelopes: categoriesTotalBalance, // Includes buffer category balance
    total_credit_card_balances: totalCreditCardBalances,
    total_pending_checks: totalPendingChecks,
    current_savings: currentSavings,
    has_negative_envelopes: hasNegativeEnvelopes,
    monthly_net_income: monthlyNetIncome,
    total_monthly_budget: totalMonthlyBudget,
  };
}

// Helper function to calculate monthly net income from settings
function calculateMonthlyNetIncome(settingsObj: Record<string, string>): number {
  const annualIncome = parseFloat(settingsObj.annual_income || settingsObj.annual_salary || '0');
  const taxRate = parseFloat(settingsObj.tax_rate || '0');
  const payFrequency = (settingsObj.pay_frequency || 'monthly') as 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'annually';
  const includeExtraPaychecks = settingsObj.include_extra_paychecks === 'true';

  // Parse pre-tax deduction items
  let preTaxDeductionItems: any[] = [];
  if (settingsObj.pre_tax_deduction_items) {
    try {
      preTaxDeductionItems = JSON.parse(settingsObj.pre_tax_deduction_items);
    } catch (e) {
      console.error('Error parsing pre_tax_deduction_items:', e);
    }
  }

  // Calculate monthly gross income based on pay frequency
  let monthlyGrossIncome: number;
  switch (payFrequency) {
    case 'weekly':
      monthlyGrossIncome = (annualIncome / 52) * (52 / 12);
      break;
    case 'bi-weekly':
      if (includeExtraPaychecks) {
        monthlyGrossIncome = annualIncome / 12;
      } else {
        monthlyGrossIncome = (annualIncome / 26) * 2;
      }
      break;
    case 'semi-monthly':
      monthlyGrossIncome = (annualIncome / 24) * 2;
      break;
    case 'monthly':
      monthlyGrossIncome = annualIncome / 12;
      break;
    case 'quarterly':
      monthlyGrossIncome = (annualIncome / 4) / 3;
      break;
    case 'annually':
      monthlyGrossIncome = annualIncome / 12;
      break;
    default:
      monthlyGrossIncome = annualIncome / 12;
  }

  // Calculate paychecks per month
  const getPaychecksPerMonth = (): number => {
    switch (payFrequency) {
      case 'weekly': return 52 / 12;
      case 'bi-weekly': return includeExtraPaychecks ? 26 / 12 : 24 / 12;
      case 'semi-monthly': return 2;
      case 'monthly': return 1;
      case 'quarterly': return 4 / 12;
      case 'annually': return 1 / 12;
      default: return 1;
    }
  };

  const getActualPaychecksPerYear = (): number => {
    switch (payFrequency) {
      case 'weekly': return 52;
      case 'bi-weekly': return 26;
      case 'semi-monthly': return 24;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'annually': return 1;
      default: return 12;
    }
  };

  // Calculate total monthly pre-tax deductions
  const paychecksPerMonth = getPaychecksPerMonth();
  const actualPaychecksPerYear = getActualPaychecksPerYear();

  const preTaxDeductionsMonthly = preTaxDeductionItems.reduce((total, item) => {
    if (item.type === 'fixed') {
      return total + (item.value * paychecksPerMonth);
    } else {
      const grossPerPaycheck = annualIncome / actualPaychecksPerYear;
      const deductionPerPaycheck = grossPerPaycheck * (item.value / 100);
      return total + (deductionPerPaycheck * paychecksPerMonth);
    }
  }, 0);

  // Calculate taxes and net income
  const annualTaxableIncome = annualIncome - (preTaxDeductionsMonthly * 12);
  const taxesPerMonth = (annualTaxableIncome * taxRate) / 12;
  const monthlyNetIncome = monthlyGrossIncome - taxesPerMonth - preTaxDeductionsMonthly;

  return monthlyNetIncome;
}

// =====================================================
// TRANSACTIONS
// =====================================================

/**
 * Helper function to extract global merchant info from nested Supabase query result
 */
function getGlobalMerchantInfo(merchantGroups: any): { logo_url: string | null; icon_name: string | null } | null {
  if (!merchantGroups?.global_merchants) return null;
  
  const globalMerchant = Array.isArray(merchantGroups.global_merchants)
    ? merchantGroups.global_merchants[0]
    : merchantGroups.global_merchants;
  
  if (!globalMerchant || globalMerchant.status !== 'active') return null;
  
  return {
    logo_url: globalMerchant.logo_url || null,
    icon_name: globalMerchant.icon_name || null,
  };
}

export async function getAllTransactions(): Promise<TransactionWithSplits[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) {
    console.warn('No active account found for getAllTransactions');
    return [];
  }

  // Get all transactions with merchant group, global merchant, account, credit card, and tags info
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select(`
      *,
      merchant_groups (
        display_name,
        global_merchant_id,
        global_merchants (
          logo_url,
          icon_name,
          status
        )
      ),
      accounts (
        name
      ),
      credit_cards (
        name
      ),
      transaction_tags (
        tags (*)
      )
    `)
    .eq('budget_account_id', accountId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (txError) throw txError;

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get all transaction IDs
  const transactionIds = transactions.map((t: any) => t.id);

  // Get ALL splits for ALL transactions in a single query (fixes N+1 problem)
  const { data: allSplits, error: splitError } = await supabase
    .from('transaction_splits')
    .select(`
      *,
      categories (
        name
      )
    `)
    .in('transaction_id', transactionIds);

  if (splitError) throw splitError;

  // Group splits by transaction_id for fast lookup
  const splitsByTransaction = new Map<number, any[]>();
  (allSplits || []).forEach((split: any) => {
    if (!splitsByTransaction.has(split.transaction_id)) {
      splitsByTransaction.set(split.transaction_id, []);
    }
    splitsByTransaction.get(split.transaction_id)!.push({
      ...split,
      category_name: split.categories?.name || 'Unknown',
    });
  });

  // Build the final result
  const transactionsWithSplits: TransactionWithSplits[] = transactions.map((transaction: any) => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    total_amount: transaction.total_amount,
    transaction_type: transaction.transaction_type || 'expense',
    merchant_group_id: transaction.merchant_group_id,
    account_id: transaction.account_id,
    credit_card_id: transaction.credit_card_id,
    is_historical: transaction.is_historical || false,
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
    merchant_name: transaction.merchant_groups?.display_name || null,
    account_name: transaction.accounts?.name || null,
    credit_card_name: transaction.credit_cards?.name || null,
    tags: (transaction.transaction_tags || []).map((tt: any) => tt.tags).filter(Boolean),
    splits: splitsByTransaction.get(transaction.id) || [],
  }));

  return transactionsWithSplits;
}

export async function searchTransactions(
  query: string,
  limit: number = 10
): Promise<TransactionWithSplits[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Search transactions by description or merchant name
  // Note: We search description directly, but merchant name requires a workaround
  // since we can't use .or() with nested relations in PostgREST
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select(`
      *,
      merchant_groups (
        display_name,
        global_merchant_id,
        global_merchants (
          logo_url,
          icon_name,
          status
        )
      ),
      accounts (
        name
      ),
      credit_cards (
        name
      ),
      transaction_tags (
        tags (*)
      )
    `)
    .eq('budget_account_id', accountId)
    .ilike('description', `%${query}%`)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (txError) throw txError;

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get all transaction IDs
  const transactionIds = transactions.map((t: any) => t.id);

  // Get splits for these transactions
  const { data: allSplits, error: splitError } = await supabase
    .from('transaction_splits')
    .select(`
      *,
      categories (
        name
      )
    `)
    .in('transaction_id', transactionIds);

  if (splitError) throw splitError;

  // Group splits by transaction_id
  const splitsByTransaction = new Map<number, any[]>();
  (allSplits || []).forEach((split: any) => {
    if (!splitsByTransaction.has(split.transaction_id)) {
      splitsByTransaction.set(split.transaction_id, []);
    }
    splitsByTransaction.get(split.transaction_id)!.push({
      ...split,
      category_name: split.categories?.name || 'Unknown',
    });
  });

  // Build the final result
  const transactionsWithSplits: TransactionWithSplits[] = transactions.map((transaction: any) => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    total_amount: transaction.total_amount,
    transaction_type: transaction.transaction_type || 'expense',
    merchant_group_id: transaction.merchant_group_id,
    account_id: transaction.account_id,
    credit_card_id: transaction.credit_card_id,
    is_historical: transaction.is_historical || false,
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
    merchant_name: transaction.merchant_groups?.display_name || null,
    account_name: transaction.accounts?.name || null,
    credit_card_name: transaction.credit_cards?.name || null,
    tags: (transaction.transaction_tags || []).map((tt: any) => tt.tags).filter(Boolean),
    splits: splitsByTransaction.get(transaction.id) || [],
  }));

  return transactionsWithSplits;
}

export interface GetTransactionsPaginatedParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  categoryIds?: number[];
  merchantGroupIds?: number[];
  transactionTypes?: ('income' | 'expense')[];
  tagIds?: number[];
  accountIds?: number[];
  creditCardIds?: number[];
  sortBy?: 'date' | 'description' | 'merchant' | 'amount';
  sortDirection?: 'asc' | 'desc';
}

export interface GetTransactionsPaginatedResult {
  transactions: TransactionWithSplits[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getTransactionsPaginated(
  params: GetTransactionsPaginatedParams = {}
): Promise<GetTransactionsPaginatedResult> {
  const {
    page = 1,
    pageSize = 50,
    searchQuery,
    startDate,
    endDate,
    categoryIds = [],
    merchantGroupIds = [],
    transactionTypes = [],
    tagIds = [],
    accountIds = [],
    creditCardIds = [],
    sortBy = 'date',
    sortDirection = 'desc',
  } = params;

  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Build base query
  let query = supabase
    .from('transactions')
    .select(`
      *,
      merchant_groups (
        display_name,
        global_merchant_id,
        global_merchants (
          logo_url,
          icon_name,
          status
        )
      ),
      accounts (
        name
      ),
      credit_cards (
        name
      ),
      transaction_tags (
        tags (*)
      )
    `, { count: 'exact' })
    .eq('budget_account_id', accountId);

  // Apply date filters
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  // Apply merchant group filters
  if (merchantGroupIds.length > 0) {
    query = query.in('merchant_group_id', merchantGroupIds);
  }

  // Apply transaction type filters
  if (transactionTypes.length > 0) {
    query = query.in('transaction_type', transactionTypes);
  }

  // Apply account filters
  if (accountIds.length > 0 && creditCardIds.length > 0) {
    // If both accounts and credit cards, use OR logic
    query = query.or(`account_id.in.(${accountIds.join(',')}),credit_card_id.in.(${creditCardIds.join(',')})`);
  } else if (accountIds.length > 0) {
    query = query.in('account_id', accountIds);
  } else if (creditCardIds.length > 0) {
    query = query.in('credit_card_id', creditCardIds);
  }

  // Apply search query (description search)
  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.ilike('description', `%${searchQuery.trim()}%`);
  }

  // If category or tag filters are active, we need to filter before pagination
  // First, get all matching transaction IDs
  let transactionIdsToFetch: number[] | null = null;
  let finalTotal = 0;
  
  if (categoryIds.length > 0 || tagIds.length > 0) {
    // Fetch all matching transaction IDs first (without pagination)
    // Build a separate query for counting (we don't need the count here, just the IDs)
    // Apply ordering to ensure we get the most recent transactions first
    const ascending = sortDirection === 'asc';
    let idQuery = query.select('id');
    
    // Apply the same ordering as the final query to ensure consistency
    switch (sortBy) {
      case 'date':
        idQuery = idQuery.order('date', { ascending }).order('created_at', { ascending });
        break;
      case 'description':
        idQuery = idQuery.order('description', { ascending }).order('date', { ascending: false });
        break;
      case 'amount':
        idQuery = idQuery.order('total_amount', { ascending }).order('date', { ascending: false });
        break;
      case 'merchant':
        idQuery = idQuery.order('merchant_group_id', { ascending }).order('date', { ascending: false });
        break;
    }
    
    const { data: allMatchingTransactions, error: countError } = await idQuery
      .limit(50000); // Reasonable limit
    
    if (countError) throw countError;
    
    if (!allMatchingTransactions || allMatchingTransactions.length === 0) {
      return {
        transactions: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
    
    const allIds = allMatchingTransactions.map((t: any) => t.id);
    
    // Get splits and tags for all matching transactions
    const [splitsResult, tagsResult] = await Promise.all([
      categoryIds.length > 0 
        ? supabase.from('transaction_splits').select('transaction_id').in('transaction_id', allIds).in('category_id', categoryIds)
        : Promise.resolve({ data: null, error: null }),
      tagIds.length > 0
        ? supabase.from('transaction_tags').select('transaction_id').in('transaction_id', allIds).in('tag_id', tagIds)
        : Promise.resolve({ data: null, error: null }),
    ]);
    
    // Filter IDs based on category/tag filters
    let filteredIds = new Set(allIds);
    
    if (categoryIds.length > 0 && splitsResult.data) {
      const transactionIdsWithCategories = new Set(splitsResult.data.map((s: any) => s.transaction_id));
      filteredIds = new Set([...filteredIds].filter(id => transactionIdsWithCategories.has(id)));
    }
    
    if (tagIds.length > 0 && tagsResult.data) {
      // For tags, transaction must have ALL selected tags (AND logic)
      const tagCountsByTransaction = new Map<number, number>();
      tagsResult.data.forEach((tt: any) => {
        tagCountsByTransaction.set(tt.transaction_id, (tagCountsByTransaction.get(tt.transaction_id) || 0) + 1);
      });
      filteredIds = new Set([...filteredIds].filter(id => tagCountsByTransaction.get(id) === tagIds.length));
    }
    
    transactionIdsToFetch = Array.from(filteredIds);
    finalTotal = transactionIdsToFetch.length;
    
    // Now rebuild query to fetch only the filtered IDs, with sorting and pagination
    query = supabase
      .from('transactions')
      .select(`
        *,
        merchant_groups (
          display_name,
          global_merchant_id,
          global_merchants (
            logo_url,
            icon_name,
            status
          )
        ),
        accounts (
          name
        ),
        credit_cards (
          name
        ),
        transaction_tags (
          tags (*)
        )
      `)
      .eq('budget_account_id', accountId)
      .in('id', transactionIdsToFetch);
    
    // Reapply sorting (ascending already defined above)
    switch (sortBy) {
      case 'date':
        query = query.order('date', { ascending }).order('created_at', { ascending });
        break;
      case 'description':
        query = query.order('description', { ascending }).order('date', { ascending: false });
        break;
      case 'amount':
        query = query.order('total_amount', { ascending }).order('date', { ascending: false });
        break;
      case 'merchant':
        query = query.order('merchant_group_id', { ascending }).order('date', { ascending: false });
        break;
    }
    
    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
  } else {
    // No category/tag filters - can use normal pagination
    const ascending = sortDirection === 'asc';
    switch (sortBy) {
      case 'date':
        query = query.order('date', { ascending }).order('created_at', { ascending });
        break;
      case 'description':
        query = query.order('description', { ascending }).order('date', { ascending: false });
        break;
      case 'amount':
        query = query.order('total_amount', { ascending }).order('date', { ascending: false });
        break;
      case 'merchant':
        query = query.order('merchant_group_id', { ascending }).order('date', { ascending: false });
        break;
    }
    
    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
  }

  // Execute query
  const { data: transactions, error: txError, count } = await query;
  
  if (!transactionIdsToFetch) {
    finalTotal = count || 0;
  }

  if (txError) throw txError;

  if (!transactions || transactions.length === 0) {
    return {
      transactions: [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  // Get all transaction IDs
  const transactionIds = transactions.map((t: any) => t.id);

  // Get splits for these transactions
  const { data: allSplits, error: splitError } = await supabase
    .from('transaction_splits')
    .select(`
      *,
      categories (
        name
      )
    `)
    .in('transaction_id', transactionIds);

  if (splitError) throw splitError;

  // Group splits by transaction_id
  const splitsByTransaction = new Map<number, any[]>();
  (allSplits || []).forEach((split: any) => {
    if (!splitsByTransaction.has(split.transaction_id)) {
      splitsByTransaction.set(split.transaction_id, []);
    }
    splitsByTransaction.get(split.transaction_id)!.push({
      ...split,
      category_name: split.categories?.name || 'Unknown',
    });
  });

  // Build the final result
  let transactionsWithSplits: TransactionWithSplits[] = transactions.map((transaction: any) => {
    const globalMerchant = getGlobalMerchantInfo(transaction.merchant_groups);
    return {
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      total_amount: transaction.total_amount,
      transaction_type: transaction.transaction_type || 'expense',
      merchant_group_id: transaction.merchant_group_id,
      account_id: transaction.account_id,
      credit_card_id: transaction.credit_card_id,
      is_historical: transaction.is_historical || false,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      merchant_name: transaction.merchant_groups?.display_name || null,
      merchant_logo_url: globalMerchant?.logo_url || null,
      merchant_icon_name: globalMerchant?.icon_name || null,
      account_name: transaction.accounts?.name || null,
      credit_card_name: transaction.credit_cards?.name || null,
      tags: (transaction.transaction_tags || []).map((tt: any) => tt.tags).filter(Boolean),
      splits: splitsByTransaction.get(transaction.id) || [],
    };
  });

  // Category and tag filters are already applied before pagination (if they were active)
  // No need to filter again here

  // Apply merchant sorting if needed (since merchant is a relation)
  if (sortBy === 'merchant') {
    transactionsWithSplits.sort((a, b) => {
      const merchantA = a.merchant_name || '';
      const merchantB = b.merchant_name || '';
      const comparison = merchantA.localeCompare(merchantB, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }


  return {
    transactions: transactionsWithSplits,
    total: finalTotal,
    page,
    pageSize,
    totalPages: Math.ceil(finalTotal / pageSize),
  };
}

export async function getTransactionById(id: number): Promise<TransactionWithSplits | null> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get transaction with merchant group, global merchant, account, credit card, and tags info
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select(`
      *,
      merchant_groups (
        display_name,
        global_merchant_id,
        global_merchants (
          logo_url,
          icon_name,
          status
        )
      ),
      accounts (
        name
      ),
      credit_cards (
        name
      ),
      transaction_tags (
        tags (*)
      )
    `)
    .eq('id', id)
    .eq('budget_account_id', accountId)
    .single();

  if (txError) {
    if (txError.code === 'PGRST116') return null;
    throw txError;
  }

  // Get splits with category names
  const { data: splits, error: splitError } = await supabase
    .from('transaction_splits')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('transaction_id', id);

  if (splitError) throw splitError;

  // Transform the splits to include category_name
  const formattedSplits = splits.map((split: any) => ({
    ...split,
    category_name: split.categories?.name || 'Unknown',
  }));

  const globalMerchant = getGlobalMerchantInfo(transaction.merchant_groups);

  return {
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    total_amount: transaction.total_amount,
    transaction_type: transaction.transaction_type || 'expense',
    merchant_group_id: transaction.merchant_group_id,
    account_id: transaction.account_id,
    credit_card_id: transaction.credit_card_id,
    is_historical: transaction.is_historical || false,
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
    merchant_name: (transaction as any).merchant_groups?.display_name || null,
    merchant_logo_url: globalMerchant?.logo_url || null,
    merchant_icon_name: globalMerchant?.icon_name || null,
    account_name: (transaction as any).accounts?.name || null,
    credit_card_name: (transaction as any).credit_cards?.name || null,
    tags: ((transaction as any).transaction_tags || []).map((tt: any) => tt.tags).filter(Boolean),
    splits: formattedSplits,
  } as TransactionWithSplits;
}

export async function createTransaction(data: {
  date: string;
  description: string;
  transaction_type?: 'income' | 'expense';
  is_historical?: boolean;
  account_id?: number | null;
  credit_card_id?: number | null;
  tag_ids?: number[];
  splits: { category_id: number; amount: number }[];
}): Promise<TransactionWithSplits> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Validate that only one of account_id or credit_card_id is set
  if (data.account_id !== null && data.account_id !== undefined && 
      data.credit_card_id !== null && data.credit_card_id !== undefined) {
    throw new Error('Transaction cannot be linked to both an account and a credit card');
  }

  const totalAmount = data.splits.reduce((sum, split) => sum + Math.abs(split.amount || 0), 0);
  // Ensure total_amount is always positive - if negative, convert to income
  const absTotalAmount = Math.abs(totalAmount);
  const isHistorical = data.is_historical || false;
  const finalTransactionType = totalAmount < 0 
    ? 'income' 
    : (data.transaction_type || 'expense');

  // Auto-assign merchant group first
  let merchantGroupId: number | null = null;
  try {
    const { getOrCreateMerchantGroup } = await import('@/lib/db/merchant-groups');
    const result = await getOrCreateMerchantGroup(data.description, true);
    merchantGroupId = result.group?.id || null;
  } catch (error) {
    console.error('Error auto-assigning merchant group:', error);
    // Continue even if merchant grouping fails
  }

  // Create transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      budget_account_id: accountId,
      date: data.date,
      description: data.description,
      total_amount: absTotalAmount,
      transaction_type: finalTransactionType,
      merchant_group_id: merchantGroupId,
      is_historical: isHistorical,
      account_id: data.account_id || null, // This is bank account, not budget account
      credit_card_id: data.credit_card_id || null,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Create splits and update category balances (skip balance updates for historical transactions)
  for (const split of data.splits) {
    // Ensure split amounts are always positive
    const absSplitAmount = Math.abs(split.amount || 0);
    
    // Insert split
    const { error: splitError } = await supabase
      .from('transaction_splits')
      .insert({
        transaction_id: transaction.id,
        category_id: split.category_id,
        amount: absSplitAmount,
      });

    if (splitError) throw splitError;

    // Update category balance (only for non-system categories and non-historical transactions)
    if (!isHistorical) {
      const { data: category } = await supabase
        .from('categories')
        .select('is_system, current_balance')
        .eq('id', split.category_id)
        .single();

      if (category && !category.is_system) {
        const oldBalance = Number(category.current_balance);
        // Update category balance based on transaction type
        const balanceChange = finalTransactionType === 'income' 
          ? absSplitAmount  // Income adds to balance
          : -absSplitAmount; // Expense subtracts from balance

        const { error: balanceError } = await supabase
          .from('categories')
          .update({
            current_balance: oldBalance + balanceChange,
            updated_at: new Date().toISOString(),
          })
          .eq('id', split.category_id);

        if (balanceError) throw balanceError;

        // Log balance change
        await logBalanceChange(
          split.category_id,
          oldBalance,
          oldBalance + balanceChange,
          'transaction_create',
          {
            transaction_id: transaction.id,
            transaction_description: data.description,
          }
        );
      }
    }
  }

  // Add tags if provided
  if (data.tag_ids && data.tag_ids.length > 0) {
    const { addTagsToTransaction } = await import('@/lib/db/tags');
    await addTagsToTransaction(transaction.id, data.tag_ids);
  } else {
    // Apply tag rules if no tags were explicitly provided
    const { applyTagRulesToTransaction } = await import('@/lib/db/tag-rules');
    const ruleTagIds = await applyTagRulesToTransaction(transaction.id);
    if (ruleTagIds.length > 0) {
      const { addTagsToTransaction } = await import('@/lib/db/tags');
      await addTagsToTransaction(transaction.id, ruleTagIds);
    }
  }

  // Return the created transaction with splits
  const result = await getTransactionById(transaction.id);
  if (!result) throw new Error('Failed to retrieve created transaction');
  return result;
}

export async function updateTransaction(
  id: number,
  data: {
    date?: string;
    description?: string;
    transaction_type?: 'income' | 'expense';
    merchant_group_id?: number | null;
    account_id?: number | null;
    credit_card_id?: number | null;
    tag_ids?: number[];
    splits?: { category_id: number; amount: number }[];
  }
): Promise<TransactionWithSplits | null> {
  const { supabase } = await getAuthenticatedUser();

  // Get existing transaction
  const existingTransaction = await getTransactionById(id);
  if (!existingTransaction) return null;

  // Validate that only one of account_id or credit_card_id is set
  const newAccountId = data.account_id !== undefined ? data.account_id : existingTransaction.account_id;
  const newCreditCardId = data.credit_card_id !== undefined ? data.credit_card_id : existingTransaction.credit_card_id;
  
  if (newAccountId !== null && newAccountId !== undefined && 
      newCreditCardId !== null && newCreditCardId !== undefined) {
    throw new Error('Transaction cannot be linked to both an account and a credit card');
  }

  // Reverse old splits (using old transaction_type)
  const oldTransactionType = existingTransaction.transaction_type || 'expense';
  const oldBalanceMap = new Map<number, number>(); // categoryId -> oldBalance
  
  for (const split of existingTransaction.splits) {
    const { data: category } = await supabase
      .from('categories')
      .select('is_system, current_balance')
      .eq('id', split.category_id)
      .single();

    if (category && !category.is_system) {
      const oldBalance = Number(category.current_balance);
      oldBalanceMap.set(split.category_id, oldBalance);
      
      // Reverse the old transaction's impact
      const oldBalanceChange = oldTransactionType === 'income'
        ? -split.amount  // Reverse income: subtract
        : split.amount;   // Reverse expense: add back

      await supabase
        .from('categories')
        .update({
          current_balance: oldBalance + oldBalanceChange,
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);
    }
  }

  // Prepare new data
  const newDate = data.date ?? existingTransaction.date;
  const newDescription = data.description ?? existingTransaction.description;
  const newMerchantGroupId = data.merchant_group_id !== undefined ? data.merchant_group_id : existingTransaction.merchant_group_id;
  const newTransactionType = data.transaction_type ?? oldTransactionType;
  const newSplits = data.splits ?? existingTransaction.splits;
  const newTotalAmount = newSplits.reduce((sum, split) => sum + split.amount, 0);

  // Update transaction
  const { error: txError } = await supabase
    .from('transactions')
    .update({
      date: newDate,
      description: newDescription,
      transaction_type: newTransactionType,
      merchant_group_id: newMerchantGroupId,
      account_id: newAccountId || null,
      credit_card_id: newCreditCardId || null,
      total_amount: newTotalAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (txError) throw txError;

  // Delete old splits
  const { error: deleteSplitsError } = await supabase
    .from('transaction_splits')
    .delete()
    .eq('transaction_id', id);

  if (deleteSplitsError) throw deleteSplitsError;

  // Insert new splits and update category balances (using new transaction_type)
  for (const split of newSplits) {
    // Insert split
    const { error: splitError } = await supabase
      .from('transaction_splits')
      .insert({
        transaction_id: id,
        category_id: split.category_id,
        amount: split.amount,
      });

    if (splitError) throw splitError;

    // Update category balance (only for non-system categories)
    const { data: category } = await supabase
      .from('categories')
      .select('is_system, current_balance')
      .eq('id', split.category_id)
      .single();

    if (category && !category.is_system) {
      const oldBalance = Number(category.current_balance);
      // Update category balance based on transaction type
      const newBalanceChange = newTransactionType === 'income'
        ? split.amount   // Income adds
        : -split.amount;  // Expense subtracts

      const { error: balanceError } = await supabase
        .from('categories')
        .update({
          current_balance: oldBalance + newBalanceChange,
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);

      if (balanceError) throw balanceError;

      // Log balance change
      await logBalanceChange(
        split.category_id,
        oldBalance,
        oldBalance + newBalanceChange,
        'transaction_update',
        {
          transaction_id: id,
          transaction_description: newDescription,
        }
      );
    }
  }

  // Update tags if provided
  if (data.tag_ids !== undefined) {
    const { setTransactionTags } = await import('@/lib/db/tags');
    await setTransactionTags(id, data.tag_ids);
  } else {
    // Apply tag rules if tags weren't explicitly set (only for new transactions)
    // Note: We don't auto-apply rules on update to avoid overwriting user choices
  }

  // Return updated transaction
  return await getTransactionById(id);
}

export async function deleteTransaction(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  // Get existing transaction
  const transaction = await getTransactionById(id);
  if (!transaction) return;

  // Reverse splits (reverse the transaction's impact on category balances)
  const transactionType = transaction.transaction_type || 'expense';
  for (const split of transaction.splits) {
    const { data: category } = await supabase
      .from('categories')
      .select('is_system, current_balance')
      .eq('id', split.category_id)
      .single();

    if (category && !category.is_system) {
      const oldBalance = Number(category.current_balance);
      // Reverse the transaction's impact based on transaction type
      const balanceChange = transactionType === 'income'
        ? -split.amount  // Reverse income: subtract
        : split.amount;   // Reverse expense: add back

      await supabase
        .from('categories')
        .update({
          current_balance: oldBalance + balanceChange,
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);

      // Log balance change
      await logBalanceChange(
        split.category_id,
        oldBalance,
        oldBalance + balanceChange,
        'transaction_delete',
        {
          transaction_id: id,
          transaction_description: transaction.description,
        }
      );
    }
  }

  // Delete splits (will cascade delete transaction_splits due to FK)
  const { error: deleteSplitsError } = await supabase
    .from('transaction_splits')
    .delete()
    .eq('transaction_id', id);

  if (deleteSplitsError) throw deleteSplitsError;

  // Delete transaction
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;
}

// =====================================================
// MERCHANT MAPPINGS
// =====================================================

export async function getAllMerchantMappings(): Promise<any[]> {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('account_id', accountId)
    .order('confidence_score', { ascending: false })
    .order('last_used', { ascending: false });

  if (error) throw error;

  // Transform to match expected format
  return data.map((mapping: any) => ({
    ...mapping,
    category_id: mapping.categories?.id,
    category_name: mapping.categories?.name,
  }));
}

export async function createMerchantMapping(data: {
  merchant_pattern: string;
  normalized_merchant: string;
  category_id: number;
  confidence_score?: number;
}): Promise<any> {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: mapping, error } = await supabase
    .from('merchant_mappings')
    .insert({
      user_id: user.id,
      merchant_pattern: data.merchant_pattern,
      normalized_merchant: data.normalized_merchant,
      category_id: data.category_id,
      confidence_score: data.confidence_score ?? 1,
      last_used: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapping;
}

export async function updateMerchantMapping(
  id: number,
  data: Partial<{
    merchant_pattern: string;
    normalized_merchant: string;
    category_id: number;
    confidence_score: number;
    last_used: string;
  }>
): Promise<any> {
  const { supabase } = await getAuthenticatedUser();

  const { data: mapping, error } = await supabase
    .from('merchant_mappings')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapping;
}

export async function deleteMerchantMapping(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('merchant_mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// IMPORTED TRANSACTIONS
// =====================================================

export async function checkDuplicateHash(hash: string): Promise<boolean> {
  const { supabase } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('imported_transactions')
    .select('id')
    .eq('hash', hash)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function importTransactions(transactions: any[], isHistorical: boolean = false, fileName: string = 'Unknown'): Promise<number> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const importDate = new Date().toISOString();

  // Filter out transactions without splits
  const validTransactions = transactions.filter(txn => txn.splits && txn.splits.length > 0);

  if (validTransactions.length === 0) {
    return 0;
  }

  // ===== STEP 1: Batch insert imported_transactions =====
  // Determine source type based on filename extension
  const isImageImport = fileName.match(/\.(jpg|jpeg|png|pdf)$/i) !== null;
  const sourceType = isImageImport ? 'Image Import' : 'CSV Import';

  const importedTransactionsData = validTransactions.map(txn => {
    // Parse originalData if it's a JSON string, otherwise use empty object
    let originalRowData = {};
    try {
      if (txn.originalData) {
        originalRowData = typeof txn.originalData === 'string' 
          ? JSON.parse(txn.originalData) 
          : txn.originalData;
      }
    } catch (e) {
      console.warn('Failed to parse originalData:', e);
    }

    // Build metadata object with original row data and other useful info
    const metadata: any = {
      originalRow: originalRowData,
      suggestedCategory: txn.suggestedCategory || null,
      suggestedMerchant: txn.merchant || null,
    };

    return {
      user_id: user.id,
      account_id: accountId,
      import_date: importDate,
      source_type: sourceType,
      source_identifier: fileName,
      transaction_date: txn.date,
      merchant: txn.merchant || txn.description,
      description: txn.description,
      amount: txn.amount,
      hash: txn.hash,
      metadata: metadata,
    };
  });

  let { data: importedTxs, error: importError } = await supabase
    .from('imported_transactions')
    .insert(importedTransactionsData)
    .select('id, hash');

  if (importError) {
    // If there are duplicate hashes, filter them out and retry
    if (importError.code === '23505') {
      console.log('Duplicate hashes detected, filtering and retrying...');

      // Get existing hashes for this user (unique constraint is on user_id + hash, not account_id)
      const hashes = validTransactions.map(txn => txn.hash).filter(h => h); // Filter out empty hashes
      const { data: existingHashes } = await supabase
        .from('imported_transactions')
        .select('hash')
        .eq('user_id', user.id)
        .in('hash', hashes);

      const existingHashSet = new Set(existingHashes?.map(h => h.hash) || []);

      console.log(`Found ${existingHashSet.size} existing hashes out of ${hashes.length} total`);

      // Filter out duplicates
      const nonDuplicates = validTransactions.filter(txn => !existingHashSet.has(txn.hash));
      const nonDuplicateData = importedTransactionsData.filter((_, i) =>
        !existingHashSet.has(validTransactions[i].hash)
      );

      if (nonDuplicateData.length === 0) {
        console.log('All transactions are duplicates, skipping import');
        return 0; // All duplicates
      }

      console.log(`Retrying with ${nonDuplicateData.length} non-duplicate transactions`);

      // Retry with non-duplicates
      const { data: retryImportedTxs, error: retryError } = await supabase
        .from('imported_transactions')
        .insert(nonDuplicateData)
        .select('id, hash');

      if (retryError) {
        console.error('Retry failed:', retryError);
        
        // If still getting duplicate error, check which hashes are causing issues
        if (retryError.code === '23505') {
          // Get all hashes we're trying to insert
          const insertHashes = nonDuplicateData.map(d => d.hash).filter(h => h);
          
          // Check for duplicates by user_id (matching the constraint)
          const { data: conflictingHashes } = await supabase
            .from('imported_transactions')
            .select('hash, transaction_date, description, amount')
            .eq('user_id', user.id)
            .in('hash', insertHashes);
          
          const conflictingHashSet = new Set(conflictingHashes?.map(h => h.hash) || []);
          const trulyNonDuplicates = nonDuplicateData.filter(d => !conflictingHashSet.has(d.hash));
          
          console.log(`Found ${conflictingHashSet.size} conflicting hashes by user_id (constraint check)`);
          console.log(`Filtering to ${trulyNonDuplicates.length} truly non-duplicate transactions`);
          
          if (trulyNonDuplicates.length === 0) {
            console.log('All transactions are duplicates after user_id check, skipping import');
            return 0;
          }
          
          // Final retry with truly non-duplicate transactions
          const { data: finalImportedTxs, error: finalError } = await supabase
            .from('imported_transactions')
            .insert(trulyNonDuplicates)
            .select('id, hash');
          
          if (finalError) {
            console.error('Final retry failed:', finalError);
            throw finalError;
          }
          
          // Update validTransactions and importedTxs
          const trulyNonDuplicateTransactions = validTransactions.filter((txn, i) => 
            !conflictingHashSet.has(nonDuplicateData[i]?.hash)
          );
          validTransactions.splice(0, validTransactions.length, ...trulyNonDuplicateTransactions);
          importedTxs = finalImportedTxs;
          
          console.log(`Successfully imported ${importedTxs?.length || 0} non-duplicate transactions after user_id check`);
        } else {
          throw retryError;
        }
      }

      // Update validTransactions and importedTxs to only include non-duplicates
      validTransactions.splice(0, validTransactions.length, ...nonDuplicates);
      importedTxs = retryImportedTxs;

      console.log(`Successfully imported ${importedTxs?.length || 0} non-duplicate transactions`);
    } else {
      throw importError;
    }
  }

  if (!importedTxs || importedTxs.length === 0) {
    return 0;
  }

  // Create hash-to-id map for linking later
  const hashToImportedId = new Map(importedTxs.map(tx => [tx.hash, tx.id]));

  // ===== STEP 2: Batch get/create merchant groups =====
  const { getOrCreateMerchantGroup } = await import('@/lib/db/merchant-groups');
  const merchantGroupPromises = validTransactions.map(async (txn) => {
    try {
      const result = await getOrCreateMerchantGroup(txn.description, true);
      return result.group?.id || null;
    } catch (error) {
      console.error('Error auto-assigning merchant group:', error);
      return null;
    }
  });

  const merchantGroupIds = await Promise.all(merchantGroupPromises);

  // ===== STEP 3: Batch insert transactions =====
  // Note: CSV parser already normalizes amounts to positive and sets transaction_type correctly
  // based on the mapping convention (positive_is_expense, positive_is_income, separate_column, etc.)
  // We trust the transaction_type from the parser - it respects the user's mapping selection
  const transactionsData = validTransactions.map((txn, index) => {
    const totalAmount = txn.splits.reduce((sum: number, split: any) => sum + (split.amount || 0), 0);
    // Ensure total_amount is always positive (safeguard - CSV parser already does this, but be defensive)
    const absTotalAmount = Math.abs(totalAmount);
    // Always trust the transaction_type from CSV parser - it's already correctly determined
    // based on the user's selected mapping convention
    const transactionType = txn.transaction_type || 'expense';
    
    // Use per-transaction is_historical if provided, otherwise fall back to global flag
    const transactionIsHistorical = txn.is_historical !== undefined ? txn.is_historical : isHistorical;
    
    return {
      user_id: user.id,
      budget_account_id: accountId,
      date: txn.date,
      description: txn.description,
      total_amount: absTotalAmount,
      transaction_type: transactionType,
      merchant_group_id: merchantGroupIds[index],
      account_id: txn.account_id || null, // This is the bank account, not budget account
      credit_card_id: txn.credit_card_id || null,
      is_historical: transactionIsHistorical,
    };
  });

  const { data: createdTransactions, error: txError } = await supabase
    .from('transactions')
    .insert(transactionsData)
    .select('id');

  if (txError) throw txError;
  if (!createdTransactions || createdTransactions.length === 0) {
    throw new Error('Failed to create transactions');
  }

  // ===== STEP 4: Batch insert transaction splits =====
  const splitsData: any[] = [];
  const categoryBalanceUpdates = new Map<number, number>(); // categoryId -> net change
  
  // Get initial category balances before any updates
  const allCategoryIds = new Set<number>();
  validTransactions.forEach(txn => {
    txn.splits?.forEach((split: any) => {
      allCategoryIds.add(split.categoryId);
    });
  });

  const { data: initialCategories } = await supabase
    .from('categories')
    .select('id, current_balance, is_system')
    .in('id', Array.from(allCategoryIds));

  const initialBalanceMap = new Map<number, number>();
  (initialCategories || [])
    .filter(cat => !cat.is_system)
    .forEach(cat => {
      initialBalanceMap.set(cat.id, Number(cat.current_balance));
    });

  // Track running balances as we process transactions
  const runningBalanceMap = new Map<number, number>();
  initialBalanceMap.forEach((balance, catId) => {
    runningBalanceMap.set(catId, balance);
  });

  // Create a map from original transaction index to created transaction ID
  const transactionIdMap = new Map<number, number>();
  createdTransactions.forEach((createdTx, idx) => {
    transactionIdMap.set(idx, createdTx.id);
  });

  // Sort transactions by date (ascending) for proper audit log ordering
  const transactionsWithIndices = validTransactions.map((txn, idx) => ({
    txn,
    originalIdx: idx,
    date: txn.date,
  })).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB; // Ascending order (oldest first)
  });

  // Track individual transaction changes for audit logging (ordered by date)
  const transactionAuditLogs: Array<{
    transactionId: number;
    transactionDate: string;
    transactionDescription: string;
    transactionType: string;
    categoryId: number;
    oldBalance: number;
    balanceChange: number;
  }> = [];

  // Process transactions in date order (ascending) to build splits and track audit logs
  for (const { txn, originalIdx } of transactionsWithIndices) {
    const transactionId = transactionIdMap.get(originalIdx)!;
    const transactionType = transactionsData[originalIdx].transaction_type;
    const transactionIsHistorical = txn.is_historical !== undefined ? txn.is_historical : isHistorical;

    txn.splits.forEach((split: any) => {
      const absSplitAmount = Math.abs(split.amount || 0);
      
      splitsData.push({
        transaction_id: transactionId,
        category_id: split.categoryId,
        amount: absSplitAmount,
      });

      // Accumulate balance updates (only for non-historical transactions)
      if (!transactionIsHistorical && !initialCategories?.find(c => c.id === split.categoryId)?.is_system) {
        const balanceChange = transactionType === 'income'
          ? absSplitAmount
          : -absSplitAmount;
        
        const currentTotal = categoryBalanceUpdates.get(split.categoryId) || 0;
        categoryBalanceUpdates.set(split.categoryId, currentTotal + balanceChange);

        // Track individual transaction for audit logging
        const oldBalance = runningBalanceMap.get(split.categoryId) || initialBalanceMap.get(split.categoryId) || 0;
        transactionAuditLogs.push({
          transactionId,
          transactionDate: txn.date,
          transactionDescription: txn.description,
          transactionType,
          categoryId: split.categoryId,
          oldBalance,
          balanceChange,
        });

        // Update running balance for next transaction
        runningBalanceMap.set(split.categoryId, oldBalance + balanceChange);
      }
    });
  }

  const { error: splitsError } = await supabase
    .from('transaction_splits')
    .insert(splitsData);

  if (splitsError) throw splitsError;

  // ===== STEP 5: Batch update category balances =====
  if (!isHistorical && categoryBalanceUpdates.size > 0) {
    // Get all affected categories
    const categoryIds = Array.from(categoryBalanceUpdates.keys());
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, current_balance, is_system')
      .in('id', categoryIds);

    if (catError) throw catError;

    // Update each category (filter out system categories)
    const updatePromises = (categories || [])
      .filter(cat => !cat.is_system)
      .map(cat => {
        const netChange = categoryBalanceUpdates.get(cat.id) || 0;
        const newBalance = Number(cat.current_balance) + netChange;

        return supabase
          .from('categories')
          .update({ current_balance: newBalance })
          .eq('id', cat.id);
      });

    await Promise.all(updatePromises);

    // Log individual balance changes for each transaction (already sorted by date ascending)
    const auditChanges = transactionAuditLogs.map(log => ({
      categoryId: log.categoryId,
      oldBalance: log.oldBalance,
      newBalance: log.oldBalance + log.balanceChange,
      changeType: 'transaction_import' as const,
      metadata: {
        transaction_id: log.transactionId,
        transaction_description: log.transactionDescription,
        transaction_date: log.transactionDate,
        import_file_name: fileName,
      },
    }));

    await logBalanceChanges(auditChanges);
  }

  // ===== STEP 6: Batch insert links =====
  const linksData = validTransactions.map((txn, index) => ({
    imported_transaction_id: hashToImportedId.get(txn.hash)!,
    transaction_id: createdTransactions[index].id,
  }));

  const { error: linksError } = await supabase
    .from('imported_transaction_links')
    .insert(linksData);

  if (linksError) throw linksError;

  // ===== STEP 7: Assign tags to transactions =====
  const transactionsWithTags = validTransactions.filter(txn => txn.tag_ids && txn.tag_ids.length > 0);
  if (transactionsWithTags.length > 0) {
    const { bulkAssignTags } = await import('@/lib/db/tags');
    for (let i = 0; i < validTransactions.length; i++) {
      const txn = validTransactions[i];
      if (txn.tag_ids && txn.tag_ids.length > 0) {
        const transactionId = createdTransactions[i].id;
        try {
          await bulkAssignTags([transactionId], txn.tag_ids);
        } catch (error) {
          console.error(`Error assigning tags to transaction ${transactionId}:`, error);
          // Continue with other transactions even if tag assignment fails
        }
      }
    }
  }

  return createdTransactions.length;
}

// =====================================================
// GOALS
// =====================================================

export async function getAllGoals(): Promise<GoalWithDetails[]> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  const { data: goals, error } = await supabase
    .from('goals')
    .select(`
      *,
      linked_account:accounts!goals_linked_account_id_fkey(*),
      linked_category:categories!goals_linked_category_id_fkey(*),
      linked_credit_card:credit_cards!goals_linked_credit_card_id_fkey(*),
      linked_loan:loans!goals_linked_loan_id_fkey(*)
    `)
    .eq('account_id', accountId)
    .order('sort_order')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Calculate current balance and progress for each goal
  const goalsWithDetails: GoalWithDetails[] = await Promise.all(
    (goals || []).map(async (goal: any) => {
      let currentBalance = 0;
      
      if (goal.goal_type === 'envelope' && goal.linked_category) {
        currentBalance = goal.linked_category.current_balance || 0;
      } else if (goal.goal_type === 'account-linked' && goal.linked_account) {
        currentBalance = goal.linked_account.balance || 0;
      } else if (goal.goal_type === 'debt-paydown') {
        if (goal.linked_credit_card) {
          currentBalance = goal.linked_credit_card.current_balance || 0;
        } else if (goal.linked_loan) {
          currentBalance = goal.linked_loan.balance || 0;
        }
      }
      
      const progress = calculateGoalProgress(goal, currentBalance);
      const status = calculateGoalStatus(goal, currentBalance);
      
      // Update status if it changed
      if (status !== goal.status) {
        try {
          await supabase
            .from('goals')
            .update({ status })
            .eq('id', goal.id);
        } catch (err) {
          console.error('Failed to update goal status:', err);
          // Non-critical update, continue
        }
      }
      
      return {
        ...goal,
        linked_credit_card: goal.linked_credit_card || null,
        linked_loan: goal.linked_loan || null,
        current_balance: currentBalance,
        progress_percentage: progress.progress_percentage,
        remaining_amount: progress.remaining_amount,
        months_remaining: progress.months_remaining,
        required_monthly_contribution: progress.required_monthly_contribution,
        projected_completion_date: progress.projected_completion_date,
        is_on_track: progress.is_on_track,
        status,
        linked_account: goal.linked_account || null,
        linked_category: goal.linked_category || null,
      };
    })
  );
  
  return goalsWithDetails;
}

export async function getGoalById(id: number): Promise<GoalWithDetails | null> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  const { data: goal, error } = await supabase
    .from('goals')
    .select(`
      *,
      linked_account:accounts!goals_linked_account_id_fkey(*),
      linked_category:categories!goals_linked_category_id_fkey(*),
      linked_credit_card:credit_cards!goals_linked_credit_card_id_fkey(*),
      linked_loan:loans!goals_linked_loan_id_fkey(*)
    `)
    .eq('id', id)
    .eq('account_id', accountId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  if (!goal) return null;
  
  let currentBalance = 0;
  if (goal.goal_type === 'envelope' && goal.linked_category) {
    currentBalance = goal.linked_category.current_balance || 0;
  } else if (goal.goal_type === 'account-linked' && goal.linked_account) {
    currentBalance = goal.linked_account.balance || 0;
  } else if (goal.goal_type === 'debt-paydown') {
    if (goal.linked_credit_card) {
      currentBalance = goal.linked_credit_card.current_balance || 0;
    } else if (goal.linked_loan) {
      currentBalance = goal.linked_loan.balance || 0;
    }
  }
  
  const progress = calculateGoalProgress(goal, currentBalance);
  const status = calculateGoalStatus(goal, currentBalance);
  
  return {
    ...goal,
    linked_credit_card: goal.linked_credit_card || null,
    linked_loan: goal.linked_loan || null,
    current_balance: currentBalance,
    progress_percentage: progress.progress_percentage,
    remaining_amount: progress.remaining_amount,
    months_remaining: progress.months_remaining,
    required_monthly_contribution: progress.required_monthly_contribution,
    projected_completion_date: progress.projected_completion_date,
    is_on_track: progress.is_on_track,
    status,
    linked_account: goal.linked_account || null,
    linked_category: goal.linked_category || null,
  };
}

export async function createGoal(data: CreateGoalRequest): Promise<GoalWithDetails> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  let linkedCategoryId: number | null = null;
  let linkedAccountId: number | null = null;
  let linkedCreditCardId: number | null = null;
  let linkedLoanId: number | null = null;
  let targetAmount = data.target_amount || 0;

  // Handle debt-paydown goals
  if (data.goal_type === 'debt-paydown') {
    if (!data.linked_credit_card_id && !data.linked_loan_id) {
      throw new Error('Credit card or loan is required for debt paydown goals');
    }
    if (data.linked_credit_card_id && data.linked_loan_id) {
      throw new Error('Cannot link both a credit card and a loan to a debt paydown goal');
    }
    
    // Handle credit card debt paydown
    if (data.linked_credit_card_id) {
      // Verify credit card exists and belongs to account
      const { data: creditCard, error: ccError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('id', data.linked_credit_card_id)
        .eq('account_id', accountId)
        .single();

      if (ccError || !creditCard) {
        throw new Error('Credit card not found or does not belong to this account');
      }

      // Check if credit card is already linked to another goal
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('linked_credit_card_id', data.linked_credit_card_id)
        .eq('account_id', accountId)
        .eq('status', 'active')
        .single();

      if (existingGoal) {
        throw new Error('Credit card is already linked to another active goal');
      }

      // Warn if balance is 0 (already paid off)
      if (creditCard.current_balance <= 0) {
        // Still allow creation, but user should be aware
        console.warn('Credit card balance is 0 or negative. Goal may complete immediately.');
      }

      // Set target_amount to credit card's current balance (starting debt amount)
      targetAmount = creditCard.current_balance;
      linkedCreditCardId = data.linked_credit_card_id;
    }

    // Handle loan debt paydown
    if (data.linked_loan_id) {
      // Verify loan exists and belongs to account
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', data.linked_loan_id)
        .eq('account_id', accountId)
        .single();

      if (loanError || !loan) {
        throw new Error('Loan not found or does not belong to this account');
      }

      // Check if loan is already linked to another goal
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('linked_loan_id', data.linked_loan_id)
        .eq('account_id', accountId)
        .eq('status', 'active')
        .single();

      if (existingGoal) {
        throw new Error('Loan is already linked to another active goal');
      }

      // Warn if balance is 0 (already paid off)
      if (loan.balance <= 0) {
        // Still allow creation, but user should be aware
        console.warn('Loan balance is 0 or negative. Goal may complete immediately.');
      }

      // Set target_amount to loan's current balance (starting debt amount)
      targetAmount = loan.balance;
      linkedLoanId = data.linked_loan_id;
    }
  }
  
  // Create category for envelope goals
  if (data.goal_type === 'envelope') {
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        account_id: accountId,
        name: data.name,
        monthly_amount: data.monthly_contribution,
        current_balance: data.starting_balance || 0,
        is_goal: true,
        sort_order: 0,
      })
      .select()
      .single();
    
    if (catError) throw catError;
    linkedCategoryId = category.id;
  }
  
  // Handle account for account-linked goals
  if (data.goal_type === 'account-linked') {
    // Option 1: Create a new account
    if (data.new_account_name) {
      if (!data.new_account_name.trim()) {
        throw new Error('Account name is required when creating a new account');
      }
      
      const { data: newAccount, error: createAccError } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          account_id: accountId,
          name: data.new_account_name.trim(),
          balance: data.new_account_balance || 0,
          account_type: data.new_account_type || 'savings',
          include_in_totals: false, // Always exclude from totals for goal accounts
          sort_order: 0,
        })
        .select()
        .single();
      
      if (createAccError) throw createAccError;
      if (!newAccount) throw new Error('Failed to create account');
      
      linkedAccountId = newAccount.id;
    }
    // Option 2: Link to existing account
    else if (data.linked_account_id) {
      // Verify account exists and belongs to account
      const { data: account, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', data.linked_account_id)
        .eq('account_id', accountId)
        .single();
      
      if (accError || !account) {
        throw new Error('Account not found or does not belong to this account');
      }
      
      // Check if account is already linked to another goal
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('linked_account_id', data.linked_account_id)
        .eq('account_id', accountId)
        .single();
      
      if (existingGoal) {
        throw new Error('Account is already linked to another goal');
      }
      
      // Set account to exclude from totals and link to goal
      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          include_in_totals: false,
          linked_goal_id: null, // Will be set after goal creation
        })
        .eq('id', data.linked_account_id);
      
      if (updateError) throw updateError;
      
      linkedAccountId = data.linked_account_id;
    } else {
      throw new Error('Either select an existing account or create a new account for account-linked goals');
    }
  }
  
  // Create goal
  // Ensure monthly_contribution is provided (default to 0 if not provided)
  const monthlyContribution = data.monthly_contribution ?? 0;
  
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      account_id: accountId,
      name: data.name,
      target_amount: targetAmount,
      target_date: data.target_date || null,
      goal_type: data.goal_type,
      monthly_contribution: monthlyContribution,
      linked_account_id: linkedAccountId,
      linked_category_id: linkedCategoryId,
      linked_credit_card_id: linkedCreditCardId,
      linked_loan_id: linkedLoanId,
      status: 'active',
      notes: data.notes || null,
    })
    .select()
    .single();
  
  if (goalError) {
    // Rollback category creation if goal creation failed
    if (linkedCategoryId) {
      await supabase.from('categories').delete().eq('id', linkedCategoryId);
    }
    throw goalError;
  }
  
  // Update account's linked_goal_id if account-linked
  if (linkedAccountId) {
    const { error: linkError } = await supabase
      .from('accounts')
      .update({ linked_goal_id: goal.id })
      .eq('id', linkedAccountId);
    
    if (linkError) {
      // Log error but don't fail goal creation
      // This can happen if PostgREST schema cache is stale (PGRST204)
      console.error('Warning: Failed to link goal to account:', linkError);
      console.error('This may be a PostgREST schema cache issue. The goal was created successfully.');
      // The goal is still created, just not linked to the account
      // User can manually link it later or refresh the schema cache
    }
  }
  
  // Fetch full goal details
  const fullGoal = await getGoalById(goal.id);
  if (!fullGoal) {
    throw new Error('Failed to fetch created goal');
  }
  return fullGoal;
}

export async function updateGoal(id: number, data: UpdateGoalRequest): Promise<GoalWithDetails> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  // Verify goal belongs to account
  const { data: existingGoal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single();
  
  if (!existingGoal) {
    throw new Error('Goal not found');
  }
  
  // Update goal
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.target_amount !== undefined) updateData.target_amount = data.target_amount;
  if (data.target_date !== undefined) updateData.target_date = data.target_date;
  if (data.monthly_contribution !== undefined) updateData.monthly_contribution = data.monthly_contribution;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  
  updateData.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', id)
    .eq('account_id', accountId);
  
  if (error) throw error;
  
  // Update linked category's monthly_amount if monthly_contribution changed
  if (data.monthly_contribution !== undefined && existingGoal.linked_category_id) {
    await supabase
      .from('categories')
      .update({ monthly_amount: data.monthly_contribution })
      .eq('id', existingGoal.linked_category_id);
  }
  
  const updatedGoal = await getGoalById(id);
  if (!updatedGoal) {
    throw new Error('Failed to fetch updated goal');
  }
  return updatedGoal;
}

export async function deleteGoal(id: number, deleteCategory: boolean = false): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  // Get goal details
  const goal = await getGoalById(id);
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  // Store category ID before deleting goal (needed for category deletion after goal is deleted)
  const categoryIdToDelete = goal.goal_type === 'envelope' && deleteCategory 
    ? goal.linked_category_id 
    : null;
  
  // Handle account unlinking
  if (goal.goal_type === 'account-linked' && goal.linked_account_id) {
    // Reset account's include_in_totals (ask user in UI, default to true)
    await supabase
      .from('accounts')
      .update({
        include_in_totals: true,
        linked_goal_id: null,
      })
      .eq('id', goal.linked_account_id);
  }
  
  // Handle category update for envelope goals (if NOT deleting category)
  if (goal.goal_type === 'envelope' && goal.linked_category_id && !deleteCategory) {
    // Convert goal category to regular category
    const { error: updateCategoryError } = await supabase
      .from('categories')
      .update({ is_goal: false })
      .eq('id', goal.linked_category_id)
      .eq('account_id', accountId); // Ensure category belongs to account
    
    if (updateCategoryError) {
      throw new Error(`Failed to update category: ${updateCategoryError.message}`);
    }
  }
  
  // Delete goal FIRST (before deleting category to avoid CHECK constraint violation)
  // The goal's linked_category_id constraint requires it to be NOT NULL for envelope goals
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);
  
  if (error) throw error;
  
  // Now delete the category if requested (after goal is deleted)
  if (categoryIdToDelete) {
    // Get category name for error message
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryIdToDelete)
      .eq('account_id', accountId)
      .single();
    
    const categoryName = category?.name || 'the category';
    
    // Delete the category (transaction_splits will cascade delete due to FK constraint)
    const { error: deleteCategoryError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryIdToDelete)
      .eq('account_id', accountId); // Ensure category belongs to account
    
    if (deleteCategoryError) {
      // Goal was already deleted, so we can't rollback
      // Throw a specific error that indicates partial success
      const partialError: any = new Error(`Goal deleted successfully, but failed to delete category "${categoryName}"`);
      partialError.partialSuccess = true;
      partialError.goalDeleted = true;
      partialError.categoryId = categoryIdToDelete;
      partialError.categoryName = categoryName;
      partialError.categoryError = deleteCategoryError.message;
      throw partialError;
    }
  }
}

// =====================================================
// MONTHLY FUNDING TRACKING
// =====================================================

/**
 * Get funded amount for a category in a specific month
 */
export async function getFundedThisMonth(
  categoryId: number,
  month: string
): Promise<number> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { data, error } = await supabase
    .from('category_monthly_funding')
    .select('funded_amount')
    .eq('account_id', accountId)
    .eq('category_id', categoryId)
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  return data?.funded_amount || 0;
}

/**
 * Record monthly funding for a category
 * Creates or updates the monthly funding record
 */
export async function recordMonthlyFunding(
  categoryId: number,
  month: string,
  amount: number,
  targetAmount?: number
): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get current funded amount
  const currentFunded = await getFundedThisMonth(categoryId, month);
  const newFundedAmount = currentFunded + amount;

  // Upsert the record
  const { error } = await supabase
    .from('category_monthly_funding')
    .upsert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId,
      month,
      funded_amount: newFundedAmount,
      target_amount: targetAmount,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'account_id,category_id,month',
    });

  if (error) throw error;
}

/**
 * Get or create monthly funding record for a category
 */
export async function getOrCreateMonthlyFunding(
  categoryId: number,
  month: string
): Promise<{ funded_amount: number; target_amount: number | null }> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Try to get existing record
  const { data: existing, error: fetchError } = await supabase
    .from('category_monthly_funding')
    .select('funded_amount, target_amount')
    .eq('account_id', accountId)
    .eq('category_id', categoryId)
    .eq('month', month)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return existing;
  }

  // Create new record with 0 funded amount
  const { data: newRecord, error: createError } = await supabase
    .from('category_monthly_funding')
    .insert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId,
      month,
      funded_amount: 0,
      target_amount: null,
    })
    .select('funded_amount, target_amount')
    .single();

  if (createError) throw createError;
  return newRecord;
}

/**
 * Check if a feature is enabled for the current user
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();

  if (!accountId) {
    return false;
  }

  const { data, error } = await supabase
    .from('user_feature_flags')
    .select('enabled')
    .eq('account_id', accountId)
    .eq('feature_name', featureName)
    .maybeSingle();

  if (error) throw error;
  return data?.enabled || false;
}


