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
  ai_conversations?: any[];
  duplicate_group_reviews?: any[];
  automatic_import_setups?: any[];
  queued_imports?: any[];
  tags?: any[];
  transaction_tags?: any[];
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
  ai_conversations?: any[];
  duplicate_group_reviews?: any[];
  automatic_import_setups?: any[];
  queued_imports?: any[];
  tags?: any[];
  transaction_tags?: any[];
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
    { data: ai_conversations },
    { data: duplicate_group_reviews },
    { data: automatic_import_setups },
    { data: queued_imports },
    { data: tags },
    { data: transaction_tags },
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
    supabase.from('ai_conversations').select('*').eq('account_id', accountId),
    supabase.from('duplicate_group_reviews').select('*').eq('budget_account_id', accountId),
    supabase.from('automatic_import_setups').select('*').eq('account_id', accountId),
    supabase.from('queued_imports').select('*').eq('account_id', accountId),
    supabase.from('tags').select('*').eq('account_id', accountId),
    supabase
      .from('transaction_tags')
      .select('*, transactions!inner(budget_account_id)')
      .eq('transactions.budget_account_id', accountId),
  ]);

  return {
    version: '2.1',
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
    ai_conversations: ai_conversations || [],
    duplicate_group_reviews: duplicate_group_reviews || [],
    automatic_import_setups: automatic_import_setups || [],
    queued_imports: queued_imports || [],
    tags: tags || [],
    transaction_tags: transaction_tags || [],
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
    ai_conversations: accountData.ai_conversations,
    duplicate_group_reviews: accountData.duplicate_group_reviews,
    automatic_import_setups: accountData.automatic_import_setups,
    queued_imports: accountData.queued_imports,
    tags: accountData.tags,
    transaction_tags: accountData.transaction_tags,
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
 * and sets all account_id fields to the current active account
 * and remaps all IDs and foreign key references to avoid conflicts
 * WARNING: This will DELETE all existing account data and replace it with the backup
 */
export async function importUserDataFromFile(backupData: UserBackupData): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  console.log('[Import] Starting import for user:', user.id, 'account:', accountId);

  // Step 1: Delete all existing account data
  const { data: accountTransactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('budget_account_id', accountId);

  const transactionIds = accountTransactions?.map(t => t.id) || [];

  const { data: accountImportedTransactions } = await supabase
    .from('imported_transactions')
    .select('id')
    .eq('account_id', accountId);

  const importedTransactionIds = accountImportedTransactions?.map(t => t.id) || [];

  if (transactionIds.length > 0) {
    await supabase.from('transaction_tags').delete().in('transaction_id', transactionIds);
    await supabase.from('transaction_splits').delete().in('transaction_id', transactionIds);
  }

  if (importedTransactionIds.length > 0) {
    await supabase.from('imported_transaction_links').delete().in('imported_transaction_id', importedTransactionIds);
  }

  await supabase.from('tags').delete().eq('account_id', accountId);
  await supabase.from('transactions').delete().eq('budget_account_id', accountId);
  await supabase.from('imported_transactions').delete().eq('account_id', accountId);
  await supabase.from('merchant_category_rules').delete().eq('account_id', accountId);
  await supabase.from('merchant_mappings').delete().eq('account_id', accountId);
  await supabase.from('merchant_groups').delete().eq('account_id', accountId);
  await supabase.from('pending_checks').delete().eq('account_id', accountId);
  await supabase.from('pre_tax_deductions').delete().eq('account_id', accountId);
  await supabase.from('income_settings').delete().eq('account_id', accountId);
  await supabase.from('settings').delete().eq('account_id', accountId);
  await supabase.from('csv_import_templates').delete().eq('account_id', accountId);
  await supabase.from('goals').delete().eq('account_id', accountId);
  await supabase.from('loans').delete().eq('account_id', accountId);
  await supabase.from('credit_cards').delete().eq('account_id', accountId);
  await supabase.from('category_monthly_funding').delete().eq('account_id', accountId);
  await supabase.from('user_feature_flags').delete().eq('account_id', accountId);
  await supabase.from('ai_conversations').delete().eq('account_id', accountId);
  await supabase.from('duplicate_group_reviews').delete().eq('budget_account_id', accountId);
  await supabase.from('queued_imports').delete().eq('account_id', accountId);
  await supabase.from('automatic_import_setups').delete().eq('account_id', accountId);
  await supabase.from('categories').delete().eq('account_id', accountId);
  await supabase.from('accounts').delete().eq('account_id', accountId);

  console.log('[Import] Deleted existing account data');

  // Step 2: Insert data and build ID mappings (using batch inserts for performance)
  const accountIdMap = new Map<number, number>();
  const categoryIdMap = new Map<number, number>();
  const creditCardIdMap = new Map<number, number>();
  const loanIdMap = new Map<number, number>();
  const transactionIdMap = new Map<number, number>();
  const merchantGroupIdMap = new Map<number, number>();
  const importedTransactionIdMap = new Map<number, number>();
  const tagIdMap = new Map<number, number>();

  // Insert accounts (batch)
  if (backupData.accounts && backupData.accounts.length > 0) {
    const accountsToInsert = backupData.accounts.map(({ id, account_id, user_id, ...account }) => ({
      ...account,
      user_id: user.id,
      account_id: accountId,
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
    const categoriesToInsert = backupData.categories.map(({ id, account_id, user_id, ...category }) => ({
      ...category,
      user_id: user.id,
      account_id: accountId,
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
    const creditCardsToInsert = backupData.credit_cards.map(({ id, account_id, user_id, ...creditCard }) => ({
      ...creditCard,
      user_id: user.id,
      account_id: accountId,
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
    const loansToInsert = backupData.loans.map(({ id, account_id, user_id, ...loan }) => ({
      ...loan,
      user_id: user.id,
      account_id: accountId,
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
    const goalsToInsert = backupData.goals.map(({ id, account_id, user_id, linked_account_id, linked_category_id, linked_credit_card_id, linked_loan_id, ...goal }) => ({
      ...goal,
      user_id: user.id,
      account_id: accountId,
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
    const merchantGroupsToInsert = backupData.merchant_groups.map(({ id, account_id, user_id, ...group }) => ({
      ...group,
      user_id: user.id,
      account_id: accountId,
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
    const merchantMappingsToInsert = backupData.merchant_mappings.map(({ id, account_id, user_id, merchant_group_id, category_id, ...mapping }) => ({
      ...mapping,
      user_id: user.id,
      account_id: accountId,
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
    const merchantCategoryRulesToInsert = backupData.merchant_category_rules.map(({ id, account_id, user_id, merchant_group_id, category_id, ...rule }) => ({
      ...rule,
      user_id: user.id,
      account_id: accountId,
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

  // Insert tags (after merchant groups, before transactions)
  if (backupData.tags && backupData.tags.length > 0) {
    const tagsToInsert = backupData.tags.map(({ id, account_id, user_id, ...tag }) => ({
      ...tag,
      user_id: user.id,
      account_id: accountId,
    }));

    const { data, error } = await supabase
      .from('tags')
      .insert(tagsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting tags:', error);
      throw error;
    }

    backupData.tags.forEach((oldTag, index) => {
      tagIdMap.set(oldTag.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'tags');
  }

  // Insert transactions (batch with remapped foreign keys)
  if (backupData.transactions && backupData.transactions.length > 0) {
    const transactionsToInsert = backupData.transactions.map(({ id, budget_account_id, user_id, merchant_group_id, account_id, credit_card_id, ...transaction }) => ({
      ...transaction,
      user_id: user.id,
      budget_account_id: accountId,
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
    const transactionSplitsToInsert = backupData.transaction_splits
      .map(({ id, transaction_id, category_id, transactions, ...split }) => {
        const newTransactionId = transaction_id ? (transactionIdMap.get(transaction_id) || null) : null;
        const newCategoryId = category_id ? (categoryIdMap.get(category_id) || null) : null;
        return {
          ...split,
          transaction_id: newTransactionId,
          category_id: newCategoryId,
        };
      })
      .filter(split => {
        // Only include splits that have both transaction_id and category_id mapped successfully
        if (!split.transaction_id || !split.category_id) {
          console.warn(`[Import] Skipping split with missing mapping: transaction_id=${split.transaction_id}, category_id=${split.category_id}`);
          return false;
        }
        return true;
      });

    if (transactionSplitsToInsert.length === 0) {
      console.warn('[Import] No valid transaction splits to insert after filtering');
    } else {
      const { error } = await supabase
        .from('transaction_splits')
        .insert(transactionSplitsToInsert);

      if (error) {
        console.error('[Import] Error inserting transaction splits:', error);
        throw error;
      }
      console.log('[Import] Inserted', transactionSplitsToInsert.length, 'transaction splits (filtered from', backupData.transaction_splits.length, 'total)');
    }
  }

  // Insert imported transactions (batch)
  if (backupData.imported_transactions && backupData.imported_transactions.length > 0) {
    const importedTransactionsToInsert = backupData.imported_transactions.map(({ id, account_id, user_id, ...importedTx }) => ({
      ...importedTx,
      user_id: user.id,
      account_id: accountId,
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

  // Insert transaction_tags (after transactions are inserted)
  if (backupData.transaction_tags && backupData.transaction_tags.length > 0) {
    const transactionTagsToInsert = backupData.transaction_tags
      .map(({ id, transaction_id, tag_id, transactions, ...tt }) => ({
        ...tt,
        transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
        tag_id: tag_id ? (tagIdMap.get(tag_id) || null) : null,
      }))
      .filter(tt => tt.transaction_id && tt.tag_id); // Only include valid mappings

    if (transactionTagsToInsert.length > 0) {
      const { error } = await supabase
        .from('transaction_tags')
        .insert(transactionTagsToInsert);

      if (error) {
        console.error('[Import] Error inserting transaction tags:', error);
        throw error;
      }
      console.log('[Import] Inserted', transactionTagsToInsert.length, 'transaction tags');
    }
  }

  // Insert pending checks (batch)
  if (backupData.pending_checks && backupData.pending_checks.length > 0) {
    const pendingChecksToInsert = backupData.pending_checks.map(({ id, account_id, user_id, ...check }) => ({
      ...check,
      user_id: user.id,
      account_id: accountId,
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
    const incomeSettingsToInsert = backupData.income_settings.map(({ id, account_id, user_id, ...income }) => ({
      ...income,
      user_id: user.id,
      account_id: accountId,
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
    const preTaxDeductionsToInsert = backupData.pre_tax_deductions.map(({ id, account_id, user_id, ...deduction }) => ({
      ...deduction,
      user_id: user.id,
      account_id: accountId,
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
    const settingsToInsert = backupData.settings.map(({ id, account_id, user_id, ...setting }) => ({
      ...setting,
      user_id: user.id,
      account_id: accountId,
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
    const csvImportTemplatesToInsert = backupData.csv_import_templates.map(({ id, account_id, user_id, ...template }) => ({
      ...template,
      user_id: user.id,
      account_id: accountId,
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
    const categoryMonthlyFundingToInsert = backupData.category_monthly_funding.map(({ id, account_id, user_id, category_id, ...funding }) => ({
      ...funding,
      user_id: user.id,
      account_id: accountId,
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

  // Insert AI conversations (batch)
  if (backupData.ai_conversations && backupData.ai_conversations.length > 0) {
    const aiConversationsToInsert = backupData.ai_conversations.map(({ id, account_id, user_id, ...conversation }) => ({
      ...conversation,
      user_id: user.id,
      account_id: accountId,
    }));

    const { error } = await supabase
      .from('ai_conversations')
      .insert(aiConversationsToInsert);

    if (error) {
      console.error('[Import] Error inserting AI conversations:', error);
      throw error;
    }
    console.log('[Import] Inserted', aiConversationsToInsert.length, 'AI conversations');
  }

  // Insert duplicate group reviews (batch with remapped transaction_ids)
  if (backupData.duplicate_group_reviews && backupData.duplicate_group_reviews.length > 0) {
    const duplicateGroupReviewsToInsert = backupData.duplicate_group_reviews.map(({ id, budget_account_id, transaction_ids, reviewed_by, ...review }) => {
      // Remap transaction_ids array to new transaction IDs
      const remappedTransactionIds = transaction_ids
        ? transaction_ids
            .map((oldId: number) => transactionIdMap.get(oldId))
            .filter((newId: number | undefined) => newId !== undefined) as number[]
        : [];

      return {
        ...review,
        budget_account_id: accountId,
        transaction_ids: remappedTransactionIds,
        reviewed_by: reviewed_by || null, // Keep reviewed_by if it exists, otherwise null
      };
    }).filter(review => review.transaction_ids.length > 0); // Only include reviews with valid remapped transaction IDs

    if (duplicateGroupReviewsToInsert.length > 0) {
      const { error } = await supabase
        .from('duplicate_group_reviews')
        .insert(duplicateGroupReviewsToInsert);

      if (error) {
        console.error('[Import] Error inserting duplicate group reviews:', error);
        throw error;
      }
      console.log('[Import] Inserted', duplicateGroupReviewsToInsert.length, 'duplicate group reviews');
    }
  }

  // Insert automatic_import_setups (after accounts, credit_cards are inserted)
  const importSetupIdMap = new Map<number, number>();
  if (backupData.automatic_import_setups && backupData.automatic_import_setups.length > 0) {
    const setupsToInsert = backupData.automatic_import_setups.map(({ 
      id, 
      account_id, 
      user_id, 
      target_account_id, 
      target_credit_card_id,
      created_by,
      ...setup 
    }) => ({
      ...setup,
      user_id: user.id,
      account_id: accountId,
      target_account_id: target_account_id ? (accountIdMap.get(target_account_id) || null) : null,
      target_credit_card_id: target_credit_card_id ? (creditCardIdMap.get(target_credit_card_id) || null) : null,
      created_by: created_by || user.id,
    }));

    const { data, error } = await supabase
      .from('automatic_import_setups')
      .insert(setupsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting automatic_import_setups:', error);
      throw error;
    }

    // Create ID mapping for queued_imports foreign key
    backupData.automatic_import_setups.forEach((oldSetup, index) => {
      importSetupIdMap.set(oldSetup.id, data[index].id);
    });
    console.log('[Import] Inserted', data.length, 'automatic import setups');
  }

  // Insert queued_imports (after automatic_import_setups, categories, accounts, credit_cards, transactions are inserted)
  // Note: queued_imports requires import_setup_id (NOT NULL), so we can only restore if automatic_import_setups exist
  if (backupData.queued_imports && backupData.queued_imports.length > 0) {
    // Filter out queued_imports that don't have a valid import_setup_id mapping
    // This handles cases where:
    // 1. Older backups don't have automatic_import_setups
    // 2. The import_setup_id in the backup doesn't exist in automatic_import_setups
    const queuedImportsToInsert = backupData.queued_imports
      .map(({ 
        id, 
        account_id, 
        import_setup_id,
        suggested_category_id,
        target_account_id,
        target_credit_card_id,
        imported_transaction_id,
        reviewed_by,
        ...queuedImport 
      }) => {
        // Map import_setup_id - if it doesn't exist in the map, return null to filter out
        const mappedImportSetupId = import_setup_id ? (importSetupIdMap.get(import_setup_id) || null) : null;
        
        // Skip if import_setup_id cannot be mapped (required NOT NULL constraint)
        if (!mappedImportSetupId) {
          return null;
        }

        return {
          ...queuedImport,
          account_id: accountId,
          import_setup_id: mappedImportSetupId,
          suggested_category_id: suggested_category_id ? (categoryIdMap.get(suggested_category_id) || null) : null,
          target_account_id: target_account_id ? (accountIdMap.get(target_account_id) || null) : null,
          target_credit_card_id: target_credit_card_id ? (creditCardIdMap.get(target_credit_card_id) || null) : null,
          imported_transaction_id: imported_transaction_id ? (transactionIdMap.get(imported_transaction_id) || null) : null,
          reviewed_by: reviewed_by || null, // Keep reviewed_by if restoring to same user, otherwise null
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (queuedImportsToInsert.length > 0) {
      const { error } = await supabase
        .from('queued_imports')
        .insert(queuedImportsToInsert);

      if (error) {
        console.error('[Import] Error inserting queued_imports:', error);
        throw error;
      }
      console.log('[Import] Inserted', queuedImportsToInsert.length, 'queued imports');
      
      // Log if any were skipped
      const skipped = backupData.queued_imports.length - queuedImportsToInsert.length;
      if (skipped > 0) {
        console.warn(`[Import] Skipped ${skipped} queued imports due to missing import_setup_id mapping (likely from older backup)`);
      }
    } else if (backupData.queued_imports.length > 0) {
      console.warn('[Import] All queued imports were skipped - no valid import_setup_id mappings found (likely from older backup without automatic_import_setups)');
    }
  }

  console.log('[Import] Import completed successfully');
}

