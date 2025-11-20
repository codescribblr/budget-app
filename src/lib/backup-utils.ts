import { getAuthenticatedUser } from './supabase-queries';

export interface UserBackupData {
  version: string;
  created_at: string;
  accounts: any[];
  categories: any[];
  credit_cards: any[];
  transactions: any[];
  transaction_splits: any[];
  imported_transactions: any[];
  imported_transaction_links: any[];
  merchant_groups: any[];
  merchant_mappings: any[];
  merchant_category_rules: any[];
  pending_checks: any[];
  income_settings: any[];
  pre_tax_deductions: any[];
  settings: any[];
  goals?: any[]; // Added in version 1.1
  csv_import_templates?: any[]; // Added in version 1.1
}

/**
 * Export all user data to a JSON backup
 */
export async function exportUserData(): Promise<UserBackupData> {
  const { supabase, user } = await getAuthenticatedUser();

  // Fetch all user data in parallel
  const [
    { data: accounts },
    { data: categories },
    { data: credit_cards },
    { data: transactions },
    { data: transaction_splits },
    { data: imported_transactions },
    { data: imported_transaction_links },
    { data: merchant_groups },
    { data: merchant_mappings },
    { data: merchant_category_rules },
    { data: pending_checks },
    { data: income_settings },
    { data: pre_tax_deductions },
    { data: settings },
    { data: goals },
    { data: csv_import_templates },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('categories').select('*').eq('user_id', user.id),
    supabase.from('credit_cards').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('*').eq('user_id', user.id),
    supabase
      .from('transaction_splits')
      .select('*, transactions!inner(user_id)')
      .eq('transactions.user_id', user.id),
    supabase.from('imported_transactions').select('*').eq('user_id', user.id),
    supabase
      .from('imported_transaction_links')
      .select('*, imported_transactions!inner(user_id)')
      .eq('imported_transactions.user_id', user.id),
    supabase.from('merchant_groups').select('*').eq('user_id', user.id),
    supabase.from('merchant_mappings').select('*').eq('user_id', user.id),
    supabase.from('merchant_category_rules').select('*').eq('user_id', user.id),
    supabase.from('pending_checks').select('*').eq('user_id', user.id),
    supabase.from('income_settings').select('*').eq('user_id', user.id),
    supabase.from('pre_tax_deductions').select('*').eq('user_id', user.id),
    supabase.from('settings').select('*').eq('user_id', user.id),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('csv_import_templates').select('*').eq('user_id', user.id),
  ]);

  return {
    version: '1.1',
    created_at: new Date().toISOString(),
    accounts: accounts || [],
    categories: categories || [],
    credit_cards: credit_cards || [],
    transactions: transactions || [],
    transaction_splits: transaction_splits || [],
    imported_transactions: imported_transactions || [],
    imported_transaction_links: imported_transaction_links || [],
    merchant_groups: merchant_groups || [],
    merchant_mappings: merchant_mappings || [],
    merchant_category_rules: merchant_category_rules || [],
    pending_checks: pending_checks || [],
    income_settings: income_settings || [],
    pre_tax_deductions: pre_tax_deductions || [],
    settings: settings || [],
    goals: goals || [],
    csv_import_templates: csv_import_templates || [],
  };
}

/**
 * Import user data from a JSON backup
 * WARNING: This will DELETE all existing user data and replace it with the backup
 */
export async function importUserData(backupData: UserBackupData): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();

  // Start a transaction-like operation by deleting all data first
  // Delete in reverse order of dependencies

  // First, get all transaction IDs for this user
  const { data: userTransactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id);

  const transactionIds = userTransactions?.map(t => t.id) || [];

  // Get all imported transaction IDs for this user
  const { data: userImportedTransactions } = await supabase
    .from('imported_transactions')
    .select('id')
    .eq('user_id', user.id);

  const importedTransactionIds = userImportedTransactions?.map(t => t.id) || [];

  // Delete in reverse order of dependencies
  // Delete transaction splits for these transactions
  if (transactionIds.length > 0) {
    await supabase.from('transaction_splits').delete().in('transaction_id', transactionIds);
  }

  // Delete imported transaction links for these imported transactions
  if (importedTransactionIds.length > 0) {
    await supabase.from('imported_transaction_links').delete().in('imported_transaction_id', importedTransactionIds);
  }

  await supabase.from('transactions').delete().eq('user_id', user.id);
  await supabase.from('imported_transactions').delete().eq('user_id', user.id);
  await supabase.from('merchant_category_rules').delete().eq('user_id', user.id);
  await supabase.from('merchant_mappings').delete().eq('user_id', user.id);
  await supabase.from('merchant_groups').delete().eq('user_id', user.id);
  await supabase.from('pending_checks').delete().eq('user_id', user.id);
  await supabase.from('pre_tax_deductions').delete().eq('user_id', user.id);
  await supabase.from('income_settings').delete().eq('user_id', user.id);
  await supabase.from('settings').delete().eq('user_id', user.id);
  await supabase.from('csv_import_templates').delete().eq('user_id', user.id);
  await supabase.from('goals').delete().eq('user_id', user.id); // Delete before categories, accounts, and credit_cards (goals depend on these)
  await supabase.from('credit_cards').delete().eq('user_id', user.id);
  await supabase.from('categories').delete().eq('user_id', user.id);
  await supabase.from('accounts').delete().eq('user_id', user.id);

  // Insert backup data
  // Insert in order of dependencies
  if (backupData.accounts.length > 0) {
    await supabase.from('accounts').insert(backupData.accounts);
  }
  
  if (backupData.categories.length > 0) {
    await supabase.from('categories').insert(backupData.categories);
  }
  
  if (backupData.credit_cards.length > 0) {
    await supabase.from('credit_cards').insert(backupData.credit_cards);
  }
  
  // Insert goals after categories, accounts, and credit_cards
  // Goals depend on: categories (envelope goals), accounts (account-linked goals), credit_cards (debt-paydown goals)
  if (backupData.goals && backupData.goals.length > 0) {
    await supabase.from('goals').insert(backupData.goals);
  }
  
  if (backupData.income_settings.length > 0) {
    await supabase.from('income_settings').insert(backupData.income_settings);
  }
  
  if (backupData.pre_tax_deductions.length > 0) {
    await supabase.from('pre_tax_deductions').insert(backupData.pre_tax_deductions);
  }
  
  if (backupData.pending_checks.length > 0) {
    await supabase.from('pending_checks').insert(backupData.pending_checks);
  }
  
  if (backupData.merchant_groups.length > 0) {
    await supabase.from('merchant_groups').insert(backupData.merchant_groups);
  }
  
  if (backupData.merchant_mappings.length > 0) {
    await supabase.from('merchant_mappings').insert(backupData.merchant_mappings);
  }

  if (backupData.merchant_category_rules && backupData.merchant_category_rules.length > 0) {
    await supabase.from('merchant_category_rules').insert(backupData.merchant_category_rules);
  }

  if (backupData.transactions.length > 0) {
    await supabase.from('transactions').insert(backupData.transactions);
  }

  if (backupData.transaction_splits.length > 0) {
    // Remove the joined transactions data before inserting
    const splits = backupData.transaction_splits.map(({ transactions, ...split }) => split);
    await supabase.from('transaction_splits').insert(splits);
  }

  if (backupData.imported_transactions && backupData.imported_transactions.length > 0) {
    await supabase.from('imported_transactions').insert(backupData.imported_transactions);
  }

  if (backupData.imported_transaction_links && backupData.imported_transaction_links.length > 0) {
    // Remove the joined imported_transactions data before inserting
    const links = backupData.imported_transaction_links.map(({ imported_transactions, ...link }) => link);
    await supabase.from('imported_transaction_links').insert(links);
  }

  if (backupData.settings && backupData.settings.length > 0) {
    await supabase.from('settings').insert(backupData.settings);
  }

  // Insert CSV import templates (if present in backup)
  if (backupData.csv_import_templates && backupData.csv_import_templates.length > 0) {
    await supabase.from('csv_import_templates').insert(backupData.csv_import_templates);
  }
}

