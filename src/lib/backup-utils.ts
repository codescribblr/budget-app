import { getAuthenticatedUser } from './supabase-queries';
import { getActiveAccountId, userHasAccountWriteAccess, userHasOwnAccount } from './account-context';

export interface AccountBackupData {
  version: string; // "2.0" for account-based backups
  created_at: string;
  created_by: string; // User ID of account owner who created backup
  
  // Account structure
  account: {
    id: number;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
  };
  
  // Collaborators
  account_users: Array<{
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'invited' | 'removed';
    invited_by: string | null;
    invited_at: string;
    accepted_at: string | null;
  }>;
  
  // Pending invitations
  account_invitations: Array<{
    email: string;
    role: 'editor' | 'viewer';
    token: string;
    invited_by: string;
    expires_at: string;
  }>;
  
  // Account data (all filtered by account_id)
  accounts: any[];
  categories: any[];
  credit_cards: any[];
  loans?: any[];
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
  goals?: any[];
  csv_import_templates?: any[];
  category_monthly_funding?: any[];
  user_feature_flags?: any[]; // User-specific, not account-specific
}

// Legacy interface for backward compatibility
export interface UserBackupData {
  version: string;
  created_at: string;
  accounts: any[];
  categories: any[];
  credit_cards: any[];
  loans?: any[];
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
  goals?: any[];
  csv_import_templates?: any[];
  category_monthly_funding?: any[];
  user_feature_flags?: any[];
}

/**
 * Export all account data to a JSON backup (account-based)
 * Only account owners can create backups
 */
export async function exportAccountData(): Promise<AccountBackupData> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Verify user has write access (owners and editors can create backups)
  const hasWriteAccess = await userHasAccountWriteAccess(accountId);
  if (!hasWriteAccess) {
    throw new Error('Unauthorized: Only account owners and editors can create backups');
  }

  // Fetch account structure
  const { data: account, error: accountError } = await supabase
    .from('budget_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    throw new Error('Account not found');
  }

  // Fetch collaborators
  const { data: accountUsers, error: usersError } = await supabase
    .from('account_users')
    .select('*')
    .eq('account_id', accountId);

  if (usersError) throw usersError;

  // Fetch pending invitations
  const { data: invitations, error: invitationsError } = await supabase
    .from('account_invitations')
    .select('*')
    .eq('account_id', accountId)
    .is('accepted_at', null);

  if (invitationsError) throw invitationsError;

  // Fetch all account data (filtered by account_id)
  const [
    { data: accounts },
    { data: categories },
    { data: credit_cards },
    { data: loans },
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
    { data: category_monthly_funding },
    { data: user_feature_flags },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('account_id', accountId),
    supabase.from('categories').select('*').eq('account_id', accountId),
    supabase.from('credit_cards').select('*').eq('account_id', accountId),
    supabase.from('loans').select('*').eq('account_id', accountId),
    supabase.from('transactions').select('*').eq('budget_account_id', accountId),
    supabase
      .from('transaction_splits')
      .select('*, transactions!inner(budget_account_id)')
      .eq('transactions.budget_account_id', accountId),
    supabase.from('imported_transactions').select('*').eq('account_id', accountId),
    supabase
      .from('imported_transaction_links')
      .select('*, imported_transactions!inner(account_id)')
      .eq('imported_transactions.account_id', accountId),
    supabase.from('merchant_groups').select('*').eq('account_id', accountId),
    supabase.from('merchant_mappings').select('*').eq('account_id', accountId),
    supabase.from('merchant_category_rules').select('*').eq('account_id', accountId),
    supabase.from('pending_checks').select('*').eq('account_id', accountId),
    supabase.from('income_settings').select('*').eq('account_id', accountId),
    supabase.from('pre_tax_deductions').select('*').eq('account_id', accountId),
    supabase.from('settings').select('*').eq('account_id', accountId),
    supabase.from('goals').select('*').eq('account_id', accountId),
    supabase.from('csv_import_templates').select('*').eq('account_id', accountId),
    supabase.from('category_monthly_funding').select('*').eq('account_id', accountId),
    supabase.from('user_feature_flags').select('*').eq('account_id', accountId),
  ]);

  return {
    version: '2.0',
    created_at: new Date().toISOString(),
    created_by: user.id,
    account: {
      id: account.id,
      name: account.name,
      owner_id: account.owner_id,
      created_at: account.created_at,
      updated_at: account.updated_at,
    },
    account_users: (accountUsers || []).map((au: any) => ({
      user_id: au.user_id,
      role: au.role,
      status: au.status,
      invited_by: au.invited_by,
      invited_at: au.invited_at,
      accepted_at: au.accepted_at,
    })),
    account_invitations: (invitations || []).map((inv: any) => ({
      email: inv.email,
      role: inv.role,
      token: inv.token,
      invited_by: inv.invited_by,
      expires_at: inv.expires_at,
    })),
    accounts: accounts || [],
    categories: categories || [],
    credit_cards: credit_cards || [],
    loans: loans || [],
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
    category_monthly_funding: category_monthly_funding || [],
    user_feature_flags: user_feature_flags || [],
  };
}

/**
 * Export all user data to a JSON backup (legacy - for backward compatibility)
 * @deprecated Use exportAccountData instead
 */
export async function exportUserData(): Promise<UserBackupData> {
  // For backward compatibility, call exportAccountData and convert
  const accountData = await exportAccountData();
  
  return {
    version: accountData.version,
    created_at: accountData.created_at,
    accounts: accountData.accounts,
    categories: accountData.categories,
    credit_cards: accountData.credit_cards,
    loans: accountData.loans,
    transactions: accountData.transactions,
    transaction_splits: accountData.transaction_splits,
    imported_transactions: accountData.imported_transactions,
    imported_transaction_links: accountData.imported_transaction_links,
    merchant_groups: accountData.merchant_groups,
    merchant_mappings: accountData.merchant_mappings,
    merchant_category_rules: accountData.merchant_category_rules,
    pending_checks: accountData.pending_checks,
    income_settings: accountData.income_settings,
    pre_tax_deductions: accountData.pre_tax_deductions,
    settings: accountData.settings,
    goals: accountData.goals,
    csv_import_templates: accountData.csv_import_templates,
    category_monthly_funding: accountData.category_monthly_funding,
    user_feature_flags: accountData.user_feature_flags,
  };
}

/**
 * Import user data from a JSON backup
 * This now uses the same ID remapping logic as importUserDataFromFile
 * to avoid ID conflicts when restoring backups
 * WARNING: This will DELETE all existing user data and replace it with the backup
 */
export async function importUserData(backupData: UserBackupData): Promise<void> {
  // Use the same logic as file import to handle ID remapping
  // This prevents ID conflicts when restoring older backups
  await importUserDataFromFile(backupData);
}

/**
 * Import user data from an uploaded file backup
 * This remaps all user_id fields to the current authenticated user
 * and remaps all IDs and foreign key references to avoid conflicts
 * WARNING: This will DELETE all existing user data and replace it with the backup
 */
export async function importUserDataFromFile(backupData: UserBackupData): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();

  console.log('[Import] Starting import for user:', user.id);

  // Step 1: Delete all existing user data
  const { data: userTransactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id);

  const transactionIds = userTransactions?.map(t => t.id) || [];

  const { data: userImportedTransactions } = await supabase
    .from('imported_transactions')
    .select('id')
    .eq('user_id', user.id);

  const importedTransactionIds = userImportedTransactions?.map(t => t.id) || [];

  if (transactionIds.length > 0) {
    await supabase.from('transaction_splits').delete().in('transaction_id', transactionIds);
  }

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
  await supabase.from('goals').delete().eq('user_id', user.id);
  await supabase.from('loans').delete().eq('user_id', user.id);
  await supabase.from('credit_cards').delete().eq('user_id', user.id);
  await supabase.from('category_monthly_funding').delete().eq('user_id', user.id);
  await supabase.from('user_feature_flags').delete().eq('user_id', user.id);
  await supabase.from('categories').delete().eq('user_id', user.id);
  await supabase.from('accounts').delete().eq('user_id', user.id);

  console.log('[Import] Deleted existing user data');

  // Step 2: Insert data and build ID mappings (using batch inserts for performance)
  const accountIdMap = new Map<number, number>();
  const categoryIdMap = new Map<number, number>();
  const creditCardIdMap = new Map<number, number>();
  const loanIdMap = new Map<number, number>();
  const transactionIdMap = new Map<number, number>();
  const merchantGroupIdMap = new Map<number, number>();
  const importedTransactionIdMap = new Map<number, number>();

  // Insert accounts (batch)
  if (backupData.accounts && backupData.accounts.length > 0) {
    const accountsToInsert = backupData.accounts.map(({ id, ...account }) => ({
      ...account,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('accounts')
      .insert(accountsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting accounts:', error);
      throw error;
    }

    // Build ID mapping (old ID -> new ID)
    backupData.accounts.forEach((oldAccount, index) => {
      accountIdMap.set(oldAccount.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'accounts');
  }

  // Insert categories (batch)
  if (backupData.categories && backupData.categories.length > 0) {
    const categoriesToInsert = backupData.categories.map(({ id, ...category }) => ({
      ...category,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting categories:', error);
      throw error;
    }

    backupData.categories.forEach((oldCategory, index) => {
      categoryIdMap.set(oldCategory.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'categories');
  }

  // Insert credit cards (batch)
  if (backupData.credit_cards && backupData.credit_cards.length > 0) {
    const creditCardsToInsert = backupData.credit_cards.map(({ id, ...creditCard }) => ({
      ...creditCard,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('credit_cards')
      .insert(creditCardsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting credit cards:', error);
      throw error;
    }

    backupData.credit_cards.forEach((oldCreditCard, index) => {
      creditCardIdMap.set(oldCreditCard.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'credit cards');
  }

  // Insert loans (batch)
  if (backupData.loans && backupData.loans.length > 0) {
    const loansToInsert = backupData.loans.map(({ id, ...loan }) => ({
      ...loan,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('loans')
      .insert(loansToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting loans:', error);
      throw error;
    }

    backupData.loans.forEach((oldLoan, index) => {
      loanIdMap.set(oldLoan.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'loans');
  }

  // Insert goals (batch with remapped foreign keys)
  if (backupData.goals && backupData.goals.length > 0) {
    const goalsToInsert = backupData.goals.map(({ id, linked_account_id, linked_category_id, linked_credit_card_id, linked_loan_id, ...goal }) => ({
      ...goal,
      user_id: user.id,
      linked_account_id: linked_account_id ? (accountIdMap.get(linked_account_id) || null) : null,
      linked_category_id: linked_category_id ? (categoryIdMap.get(linked_category_id) || null) : null,
      linked_credit_card_id: linked_credit_card_id ? (creditCardIdMap.get(linked_credit_card_id) || null) : null,
      linked_loan_id: linked_loan_id ? (loanIdMap.get(linked_loan_id) || null) : null,
    }));

    const { error } = await supabase
      .from('goals')
      .insert(goalsToInsert);

    if (error) {
      console.error('[Import] Error inserting goals:', error);
      throw error;
    }
    console.log('[Import] Inserted', goalsToInsert.length, 'goals');
  }

  // Insert merchant groups (batch)
  if (backupData.merchant_groups && backupData.merchant_groups.length > 0) {
    const merchantGroupsToInsert = backupData.merchant_groups.map(({ id, ...group }) => ({
      ...group,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('merchant_groups')
      .insert(merchantGroupsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting merchant groups:', error);
      throw error;
    }

    backupData.merchant_groups.forEach((oldGroup, index) => {
      merchantGroupIdMap.set(oldGroup.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'merchant groups');
  }

  // Insert merchant mappings (batch with remapped merchant_group_id)
  if (backupData.merchant_mappings && backupData.merchant_mappings.length > 0) {
    const merchantMappingsToInsert = backupData.merchant_mappings.map(({ id, merchant_group_id, category_id, ...mapping }) => ({
      ...mapping,
      user_id: user.id,
      merchant_group_id: merchant_group_id ? (merchantGroupIdMap.get(merchant_group_id) || null) : null,
    }));

    const { error } = await supabase
      .from('merchant_mappings')
      .insert(merchantMappingsToInsert);

    if (error) {
      console.error('[Import] Error inserting merchant mappings:', error);
      throw error;
    }
    console.log('[Import] Inserted', merchantMappingsToInsert.length, 'merchant mappings');
  }

  // Insert merchant category rules (batch with remapped IDs)
  if (backupData.merchant_category_rules && backupData.merchant_category_rules.length > 0) {
    const merchantCategoryRulesToInsert = backupData.merchant_category_rules.map(({ id, merchant_group_id, category_id, ...rule }) => ({
      ...rule,
      user_id: user.id,
      merchant_group_id: merchant_group_id ? (merchantGroupIdMap.get(merchant_group_id) || null) : null,
      category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
    }));

    const { error } = await supabase
      .from('merchant_category_rules')
      .insert(merchantCategoryRulesToInsert);

    if (error) {
      console.error('[Import] Error inserting merchant category rules:', error);
      throw error;
    }
    console.log('[Import] Inserted', merchantCategoryRulesToInsert.length, 'merchant category rules');
  }

  // Insert transactions (batch with remapped foreign keys)
  if (backupData.transactions && backupData.transactions.length > 0) {
    const transactionsToInsert = backupData.transactions.map(({ id, merchant_group_id, account_id, credit_card_id, ...transaction }) => ({
      ...transaction,
      user_id: user.id,
      merchant_group_id: merchant_group_id ? (merchantGroupIdMap.get(merchant_group_id) || null) : null,
      account_id: account_id ? (accountIdMap.get(account_id) || null) : null,
      credit_card_id: credit_card_id ? (creditCardIdMap.get(credit_card_id) || null) : null,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting transactions:', error);
      throw error;
    }

    backupData.transactions.forEach((oldTransaction, index) => {
      transactionIdMap.set(oldTransaction.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'transactions');
  }

  // Insert transaction splits (batch with remapped IDs)
  if (backupData.transaction_splits && backupData.transaction_splits.length > 0) {
    const transactionSplitsToInsert = backupData.transaction_splits.map(({ id, transaction_id, category_id, transactions, ...split }) => ({
      ...split,
      transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
      category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
    }));

    const { error } = await supabase
      .from('transaction_splits')
      .insert(transactionSplitsToInsert);

    if (error) {
      console.error('[Import] Error inserting transaction splits:', error);
      throw error;
    }
    console.log('[Import] Inserted', transactionSplitsToInsert.length, 'transaction splits');
  }

  // Insert imported transactions (batch)
  if (backupData.imported_transactions && backupData.imported_transactions.length > 0) {
    const importedTransactionsToInsert = backupData.imported_transactions.map(({ id, ...importedTx }) => ({
      ...importedTx,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('imported_transactions')
      .insert(importedTransactionsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting imported transactions:', error);
      throw error;
    }

    backupData.imported_transactions.forEach((oldImportedTx, index) => {
      importedTransactionIdMap.set(oldImportedTx.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'imported transactions');
  }

  // Insert imported transaction links (batch with remapped IDs)
  if (backupData.imported_transaction_links && backupData.imported_transaction_links.length > 0) {
    const importedTransactionLinksToInsert = backupData.imported_transaction_links.map(({ id, imported_transaction_id, transaction_id, imported_transactions, ...link }) => ({
      ...link,
      imported_transaction_id: imported_transaction_id ? (importedTransactionIdMap.get(imported_transaction_id) || null) : null,
      transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
    }));

    const { error } = await supabase
      .from('imported_transaction_links')
      .insert(importedTransactionLinksToInsert);

    if (error) {
      console.error('[Import] Error inserting imported transaction links:', error);
      throw error;
    }
    console.log('[Import] Inserted', importedTransactionLinksToInsert.length, 'imported transaction links');
  }

  // Insert pending checks (batch)
  if (backupData.pending_checks && backupData.pending_checks.length > 0) {
    const pendingChecksToInsert = backupData.pending_checks.map(({ id, ...check }) => ({
      ...check,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('pending_checks')
      .insert(pendingChecksToInsert);

    if (error) {
      console.error('[Import] Error inserting pending checks:', error);
      throw error;
    }
    console.log('[Import] Inserted', pendingChecksToInsert.length, 'pending checks');
  }

  // Insert income settings (batch)
  if (backupData.income_settings && backupData.income_settings.length > 0) {
    const incomeSettingsToInsert = backupData.income_settings.map(({ id, ...income }) => ({
      ...income,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('income_settings')
      .insert(incomeSettingsToInsert);

    if (error) {
      console.error('[Import] Error inserting income settings:', error);
      throw error;
    }
    console.log('[Import] Inserted', incomeSettingsToInsert.length, 'income settings');
  }

  // Insert pre-tax deductions (batch)
  if (backupData.pre_tax_deductions && backupData.pre_tax_deductions.length > 0) {
    const preTaxDeductionsToInsert = backupData.pre_tax_deductions.map(({ id, ...deduction }) => ({
      ...deduction,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('pre_tax_deductions')
      .insert(preTaxDeductionsToInsert);

    if (error) {
      console.error('[Import] Error inserting pre-tax deductions:', error);
      throw error;
    }
    console.log('[Import] Inserted', preTaxDeductionsToInsert.length, 'pre-tax deductions');
  }

  // Insert settings (batch)
  if (backupData.settings && backupData.settings.length > 0) {
    const settingsToInsert = backupData.settings.map(({ id, ...setting }) => ({
      ...setting,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('settings')
      .insert(settingsToInsert);

    if (error) {
      console.error('[Import] Error inserting settings:', error);
      throw error;
    }
    console.log('[Import] Inserted', settingsToInsert.length, 'settings');
  }

  // Insert CSV import templates (batch)
  if (backupData.csv_import_templates && backupData.csv_import_templates.length > 0) {
    const csvImportTemplatesToInsert = backupData.csv_import_templates.map(({ id, ...template }) => ({
      ...template,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('csv_import_templates')
      .insert(csvImportTemplatesToInsert);

    if (error) {
      console.error('[Import] Error inserting CSV import templates:', error);
      throw error;
    }
    console.log('[Import] Inserted', csvImportTemplatesToInsert.length, 'CSV import templates');
  }

  // Insert category monthly funding (batch with remapped category_id)
  if (backupData.category_monthly_funding && backupData.category_monthly_funding.length > 0) {
    const categoryMonthlyFundingToInsert = backupData.category_monthly_funding.map(({ id, category_id, ...funding }) => ({
      ...funding,
      user_id: user.id,
      category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
    }));

    const { error } = await supabase
      .from('category_monthly_funding')
      .insert(categoryMonthlyFundingToInsert);

    if (error) {
      console.error('[Import] Error inserting category monthly funding:', error);
      throw error;
    }
    console.log('[Import] Inserted', categoryMonthlyFundingToInsert.length, 'category monthly funding records');
  }

  // Insert user feature flags (batch)
  if (backupData.user_feature_flags && backupData.user_feature_flags.length > 0) {
    const userFeatureFlagsToInsert = backupData.user_feature_flags.map(({ id, user_id, ...flag }) => ({
      ...flag,
      account_id: accountId,
    }));

    const { error } = await supabase
      .from('user_feature_flags')
      .insert(userFeatureFlagsToInsert);

    if (error) {
      console.error('[Import] Error inserting user feature flags:', error);
      throw error;
    }
    console.log('[Import] Inserted', userFeatureFlagsToInsert.length, 'user feature flags');
  }

  console.log('[Import] Import completed successfully');
}

