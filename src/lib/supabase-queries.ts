import { createClient } from './supabase/server';
import type {
  Category,
  Account,
  CreditCard,
  Transaction,
  TransactionSplit,
  PendingCheck,
  TransactionWithSplits,
  DashboardSummary,
} from './types';

// =====================================================
// HELPER: Get authenticated user
// =====================================================
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return { supabase, user };
}

// =====================================================
// CATEGORIES
// =====================================================

export async function getAllCategories(): Promise<Category[]> {
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  
  if (error) throw error;
  return data as Category[];
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
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
}): Promise<Category> {
  const { supabase, user } = await getAuthenticatedUser();
  
  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: data.name,
      monthly_amount: data.monthly_amount,
      current_balance: data.current_balance ?? 0,
      sort_order: data.sort_order ?? 0,
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
  }>
): Promise<Category | null> {
  const { supabase } = await getAuthenticatedUser();
  
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.monthly_amount !== undefined) updateData.monthly_amount = data.monthly_amount;
  if (data.current_balance !== undefined) updateData.current_balance = data.current_balance;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  
  const { data: category, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return category as Category;
}

export async function deleteCategory(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// =====================================================
// ACCOUNTS
// =====================================================

export async function getAllAccounts(): Promise<Account[]> {
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
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
  include_in_totals?: number;
  sort_order?: number;
}): Promise<Account> {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: data.name,
      balance: data.balance ?? 0,
      account_type: data.account_type ?? 'checking',
      include_in_totals: data.include_in_totals ?? 1,
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
    include_in_totals: number;
    sort_order: number;
  }>
): Promise<Account | null> {
  const { supabase } = await getAuthenticatedUser();
  
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
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
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
  include_in_totals?: number;
  sort_order?: number;
}): Promise<CreditCard> {
  const { supabase, user } = await getAuthenticatedUser();

  const creditLimit = data.credit_limit ?? 0;
  const availableCredit = data.available_credit ?? 0;
  const currentBalance = creditLimit - availableCredit;

  const { data: creditCard, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: user.id,
      name: data.name,
      credit_limit: creditLimit,
      available_credit: availableCredit,
      current_balance: currentBalance,
      include_in_totals: data.include_in_totals ?? 1,
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
    include_in_totals: number;
    sort_order: number;
  }>
): Promise<CreditCard | null> {
  const { supabase } = await getAuthenticatedUser();

  // If credit_limit or available_credit is being updated, recalculate current_balance
  if (data.credit_limit !== undefined || data.available_credit !== undefined) {
    // Get current values if not provided in update
    const { data: currentCard } = await supabase
      .from('credit_cards')
      .select('credit_limit, available_credit')
      .eq('id', id)
      .single();

    if (currentCard) {
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
// PENDING CHECKS
// =====================================================

export async function getAllPendingChecks(): Promise<PendingCheck[]> {
  const { supabase } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('pending_checks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PendingCheck[];
}

export async function getPendingCheckById(id: number): Promise<PendingCheck | null> {
  const { supabase } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('pending_checks')
    .select('*')
    .eq('id', id)
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
}): Promise<PendingCheck> {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: check, error } = await supabase
    .from('pending_checks')
    .insert({
      user_id: user.id,
      description: data.description,
      amount: data.amount,
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
  }>
): Promise<PendingCheck | null> {
  const { supabase } = await getAuthenticatedUser();

  const { data: check, error } = await supabase
    .from('pending_checks')
    .update(data)
    .eq('id', id)
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
  const { supabase } = await getAuthenticatedUser();

  // Get all categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  if (catError) throw catError;

  // Get all accounts
  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('*');

  if (accError) throw accError;

  // Get all credit cards
  const { data: creditCards, error: ccError } = await supabase
    .from('credit_cards')
    .select('*');

  if (ccError) throw ccError;

  // Get all pending checks
  const { data: pendingChecks, error: pcError } = await supabase
    .from('pending_checks')
    .select('*');

  if (pcError) throw pcError;

  // Calculate totals (only include accounts/credit cards with include_in_totals = 1)
  const totalMonies = (accounts as Account[])
    .filter(acc => acc.include_in_totals === 1)
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  const totalEnvelopes = (categories as Category[])
    .filter(cat => !cat.is_system)
    .reduce((sum, cat) => sum + Number(cat.current_balance), 0);

  const totalCreditCardBalances = (creditCards as CreditCard[])
    .filter(cc => cc.include_in_totals === 1)
    .reduce((sum, cc) => sum + Number(cc.current_balance), 0);

  const totalPendingChecks = (pendingChecks as any[])
    .reduce((sum, pc) => sum + Number(pc.amount), 0);

  const currentSavings = totalMonies - totalEnvelopes - totalCreditCardBalances - totalPendingChecks;

  return {
    total_monies: totalMonies,
    total_envelopes: totalEnvelopes,
    total_credit_card_balances: totalCreditCardBalances,
    total_pending_checks: totalPendingChecks,
    current_savings: currentSavings,
  };
}

// =====================================================
// TRANSACTIONS
// =====================================================

export async function getAllTransactions(): Promise<TransactionWithSplits[]> {
  const { supabase } = await getAuthenticatedUser();

  // Get all transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (txError) throw txError;

  // Get all splits with category names
  const transactionsWithSplits: TransactionWithSplits[] = [];

  for (const transaction of transactions as Transaction[]) {
    const { data: splits, error: splitError } = await supabase
      .from('transaction_splits')
      .select(`
        *,
        categories (
          name
        )
      `)
      .eq('transaction_id', transaction.id);

    if (splitError) throw splitError;

    // Transform the splits to include category_name
    const formattedSplits = splits.map((split: any) => ({
      ...split,
      category_name: split.categories?.name || 'Unknown',
    }));

    transactionsWithSplits.push({
      ...transaction,
      splits: formattedSplits,
    });
  }

  return transactionsWithSplits;
}

export async function getTransactionById(id: number): Promise<TransactionWithSplits | null> {
  const { supabase } = await getAuthenticatedUser();

  // Get transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
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

  return {
    ...transaction,
    splits: formattedSplits,
  } as TransactionWithSplits;
}

export async function createTransaction(data: {
  date: string;
  description: string;
  splits: { category_id: number; amount: number }[];
}): Promise<TransactionWithSplits> {
  const { supabase, user } = await getAuthenticatedUser();

  const totalAmount = data.splits.reduce((sum, split) => sum + split.amount, 0);

  // Create transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      date: data.date,
      description: data.description,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Create splits and update category balances
  for (const split of data.splits) {
    // Insert split
    const { error: splitError } = await supabase
      .from('transaction_splits')
      .insert({
        transaction_id: transaction.id,
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
      const { error: balanceError } = await supabase
        .from('categories')
        .update({
          current_balance: Number(category.current_balance) - split.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);

      if (balanceError) throw balanceError;
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
    splits?: { category_id: number; amount: number }[];
  }
): Promise<TransactionWithSplits | null> {
  const { supabase } = await getAuthenticatedUser();

  // Get existing transaction
  const existingTransaction = await getTransactionById(id);
  if (!existingTransaction) return null;

  // Reverse old splits (add back to category balances)
  for (const split of existingTransaction.splits) {
    const { data: category } = await supabase
      .from('categories')
      .select('is_system, current_balance')
      .eq('id', split.category_id)
      .single();

    if (category && !category.is_system) {
      await supabase
        .from('categories')
        .update({
          current_balance: Number(category.current_balance) + Number(split.amount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);
    }
  }

  // Prepare new data
  const newDate = data.date ?? existingTransaction.date;
  const newDescription = data.description ?? existingTransaction.description;
  const newSplits = data.splits ?? existingTransaction.splits;
  const newTotalAmount = newSplits.reduce((sum, split) => sum + split.amount, 0);

  // Update transaction
  const { error: txError } = await supabase
    .from('transactions')
    .update({
      date: newDate,
      description: newDescription,
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

  // Insert new splits and update category balances
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
      const { error: balanceError } = await supabase
        .from('categories')
        .update({
          current_balance: Number(category.current_balance) - split.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);

      if (balanceError) throw balanceError;
    }
  }

  // Return updated transaction
  return await getTransactionById(id);
}

export async function deleteTransaction(id: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  // Get existing transaction
  const transaction = await getTransactionById(id);
  if (!transaction) return;

  // Reverse splits (add back to category balances)
  for (const split of transaction.splits) {
    const { data: category } = await supabase
      .from('categories')
      .select('is_system, current_balance')
      .eq('id', split.category_id)
      .single();

    if (category && !category.is_system) {
      await supabase
        .from('categories')
        .update({
          current_balance: Number(category.current_balance) + Number(split.amount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', split.category_id);
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

  const { data, error } = await supabase
    .from('merchant_mappings')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
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

export async function importTransactions(transactions: any[]): Promise<number> {
  const { supabase, user } = await getAuthenticatedUser();

  const importDate = new Date().toISOString();
  let importedCount = 0;

  for (const txn of transactions) {
    // Only import transactions that have splits (are categorized)
    if (!txn.splits || txn.splits.length === 0) {
      continue;
    }

    // Calculate total amount from splits
    const totalAmount = txn.splits.reduce((sum: number, split: any) => sum + split.amount, 0);

    // Insert into imported_transactions
    const { data: importedTx, error: importError } = await supabase
      .from('imported_transactions')
      .insert({
        user_id: user.id,
        import_date: importDate,
        source_type: 'CSV Import',
        source_identifier: 'Unknown',
        transaction_date: txn.date,
        merchant: txn.merchant || txn.description,
        description: txn.description,
        amount: txn.amount,
        hash: txn.hash,
      })
      .select()
      .single();

    if (importError) {
      // Skip if duplicate hash
      if (importError.code === '23505') continue;
      throw importError;
    }

    // Create main transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        date: txn.date,
        description: txn.description,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Create splits and update category balances
    for (const split of txn.splits) {
      // Insert split
      const { error: splitError } = await supabase
        .from('transaction_splits')
        .insert({
          transaction_id: transaction.id,
          category_id: split.categoryId,
          amount: split.amount,
        });

      if (splitError) throw splitError;

      // Update category balance
      const { data: category } = await supabase
        .from('categories')
        .select('is_system, current_balance')
        .eq('id', split.categoryId)
        .single();

      if (category && !category.is_system) {
        await supabase
          .from('categories')
          .update({
            current_balance: Number(category.current_balance) - split.amount,
          })
          .eq('id', split.categoryId);
      }
    }

    // Link imported transaction to created transaction
    const { error: linkError } = await supabase
      .from('imported_transaction_links')
      .insert({
        imported_transaction_id: importedTx.id,
        transaction_id: transaction.id,
      });

    if (linkError) throw linkError;

    importedCount++;
  }

  return importedCount;
}

