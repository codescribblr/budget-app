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
  tag_rules?: any[];
  recurring_transactions?: any[];
  recurring_transaction_matches?: any[];
  notifications?: any[];
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
  tag_rules?: any[];
  recurring_transactions?: any[];
  recurring_transaction_matches?: any[];
  notifications?: any[];
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

  // Helper function to fetch all records with pagination (Supabase default limit is 1000)
  async function fetchAllRecords<T>(
    queryBuilder: (limit: number, offset: number) => any,
    batchSize: number = 1000
  ): Promise<T[]> {
    const allRecords: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const query = queryBuilder(batchSize, offset);
      const { data, error } = await query;
      if (error) throw error;
      
      if (data && data.length > 0) {
        allRecords.push(...data);
        offset += batchSize;
        hasMore = data.length === batchSize; // If we got a full batch, there might be more
      } else {
        hasMore = false;
      }
    }

    return allRecords;
  }

  // Helper function to safely fetch records from a table that might not exist
  async function fetchAllRecordsSafe<T>(
    queryBuilder: (limit: number, offset: number) => any,
    tableName: string,
    batchSize: number = 1000
  ): Promise<T[]> {
    try {
      return await fetchAllRecords(queryBuilder, batchSize);
    } catch (error: any) {
      // If table doesn't exist, return empty array (for backward compatibility)
      if (error?.message?.includes('Could not find the table') || 
          error?.message?.includes('does not exist') ||
          error?.code === 'PGRST204') {
        console.warn(`[Export] Table '${tableName}' does not exist, skipping (this is OK for older schemas)`);
        return [];
      }
      throw error;
    }
  }

  // Fetch all account data (filtered by account_id)
  // Use pagination for tables that might have >1000 records (Supabase default limit)
  const [
    accounts,
    categories,
    credit_cards,
    loans,
    transactions,
    transaction_splits,
    imported_transactions,
    imported_transaction_links,
    merchant_groups,
    merchant_mappings,
    merchant_category_rules,
    pending_checks,
    income_settings,
    pre_tax_deductions,
    settings,
    goals,
    csv_import_templates,
    category_monthly_funding,
    user_feature_flags,
    ai_conversations,
    duplicate_group_reviews,
    automatic_import_setups,
    queued_imports,
    tags,
    transaction_tags,
    tag_rules,
    recurring_transactions,
    recurring_transaction_matches,
    notifications,
  ] = await Promise.all([
    fetchAllRecords((limit, offset) => supabase.from('accounts').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('categories').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('credit_cards').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('loans').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('transactions').select('*').eq('budget_account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase
      .from('transaction_splits')
      .select('*, transactions!inner(budget_account_id)')
      .eq('transactions.budget_account_id', accountId)
      .range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('imported_transactions').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    // Imported transaction links: ensure both imported_transaction and transaction belong to this account
    // When importing to a new account, account_id fields are remapped, but the link IDs are remapped via maps
    fetchAllRecords((limit, offset) => supabase
      .from('imported_transaction_links')
      .select('*, imported_transactions!inner(account_id), transactions!inner(budget_account_id)')
      .eq('imported_transactions.account_id', accountId)
      .eq('transactions.budget_account_id', accountId)
      .range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('merchant_groups').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('merchant_mappings').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('merchant_category_rules').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('pending_checks').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecordsSafe((limit, offset) => supabase.from('income_settings').select('*').eq('account_id', accountId).range(offset, offset + limit - 1), 'income_settings'),
    fetchAllRecordsSafe((limit, offset) => supabase.from('pre_tax_deductions').select('*').eq('account_id', accountId).range(offset, offset + limit - 1), 'pre_tax_deductions'),
    fetchAllRecords((limit, offset) => supabase.from('settings').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('goals').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('csv_import_templates').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('category_monthly_funding').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('user_feature_flags').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('ai_conversations').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('duplicate_group_reviews').select('*').eq('budget_account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('automatic_import_setups').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('queued_imports').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('tags').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase
      .from('transaction_tags')
      .select('*, transactions!inner(budget_account_id)')
      .eq('transactions.budget_account_id', accountId)
      .range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('tag_rules').select('*').eq('account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase.from('recurring_transactions').select('*').eq('budget_account_id', accountId).range(offset, offset + limit - 1)),
    fetchAllRecords((limit, offset) => supabase
      .from('recurring_transaction_matches')
      .select('*, recurring_transactions!inner(budget_account_id)')
      .eq('recurring_transactions.budget_account_id', accountId)
      .range(offset, offset + limit - 1)),
    // Only export account-scoped notifications (budget_account_id IS NOT NULL)
    // User-level notifications (budget_account_id IS NULL) are not included in account backups
    fetchAllRecords((limit, offset) => supabase.from('notifications').select('*').eq('budget_account_id', accountId).range(offset, offset + limit - 1)),
  ]);

  // Validate data integrity: ensure all referenced transactions exist
  const transactionIds = new Set(transactions.map((t: any) => t.id));
  const importedTransactionIds = new Set(imported_transactions.map((t: any) => t.id));
  
  // Filter out any links that reference non-existent transactions (data integrity check)
  const validImportedTransactionLinks = imported_transaction_links.filter((link: any) => {
    const hasValidImportedTransaction = link.imported_transaction_id && importedTransactionIds.has(link.imported_transaction_id);
    const hasValidTransaction = link.transaction_id && transactionIds.has(link.transaction_id);
    
    if (!hasValidImportedTransaction || !hasValidTransaction) {
      console.warn(`[Export] Filtering out invalid link: imported_transaction_id=${link.imported_transaction_id} (exists: ${hasValidImportedTransaction}), transaction_id=${link.transaction_id} (exists: ${hasValidTransaction})`);
      return false;
    }
    return true;
  });

  if (imported_transaction_links.length !== validImportedTransactionLinks.length) {
    console.warn(`[Export] Filtered out ${imported_transaction_links.length - validImportedTransactionLinks.length} invalid imported_transaction_links`);
  }

  console.log(`[Export] Exported ${queued_imports.length} queued imports`);

  return {
    version: '2.2',
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
    accounts: accounts,
    categories: categories,
    credit_cards: credit_cards,
    loans: loans,
    transactions: transactions,
    transaction_splits: transaction_splits,
    imported_transactions: imported_transactions,
    imported_transaction_links: validImportedTransactionLinks,
    merchant_groups: merchant_groups,
    merchant_mappings: merchant_mappings,
    merchant_category_rules: merchant_category_rules,
    pending_checks: pending_checks,
    income_settings: income_settings,
    pre_tax_deductions: pre_tax_deductions,
    settings: settings,
    goals: goals,
    csv_import_templates: csv_import_templates,
    category_monthly_funding: category_monthly_funding,
    user_feature_flags: user_feature_flags,
    ai_conversations: ai_conversations,
    duplicate_group_reviews: duplicate_group_reviews,
    automatic_import_setups: automatic_import_setups,
    queued_imports: queued_imports,
    tags: tags,
    transaction_tags: transaction_tags,
    tag_rules: tag_rules,
    recurring_transactions: recurring_transactions,
    recurring_transaction_matches: recurring_transaction_matches,
    notifications: notifications,
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
    tag_rules: accountData.tag_rules,
    recurring_transactions: accountData.recurring_transactions,
    recurring_transaction_matches: accountData.recurring_transaction_matches,
    notifications: accountData.notifications,
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
    await supabase.from('recurring_transaction_matches').delete().in('transaction_id', transactionIds);
  }

  if (importedTransactionIds.length > 0) {
    await supabase.from('imported_transaction_links').delete().in('imported_transaction_id', importedTransactionIds);
  }

  await supabase.from('tag_rules').delete().eq('account_id', accountId);
  await supabase.from('tags').delete().eq('account_id', accountId);
  // Only delete recurring_transactions if they exist in the backup (to avoid data loss with older backups)
  if (backupData.recurring_transactions !== undefined) {
    // Delete recurring_transaction_matches first (they reference recurring_transactions)
    const { data: recurringTransactions } = await supabase
      .from('recurring_transactions')
      .select('id')
      .eq('budget_account_id', accountId);
    const recurringTransactionIds = recurringTransactions?.map(rt => rt.id) || [];
    if (recurringTransactionIds.length > 0) {
      await supabase.from('recurring_transaction_matches').delete().in('recurring_transaction_id', recurringTransactionIds);
    }
    await supabase.from('recurring_transactions').delete().eq('budget_account_id', accountId);
  }
  // Only delete notifications if they exist in the backup (to avoid data loss with older backups)
  if (backupData.notifications !== undefined) {
    await supabase.from('notifications').delete().eq('budget_account_id', accountId);
  }
  await supabase.from('transactions').delete().eq('budget_account_id', accountId);
  await supabase.from('imported_transactions').delete().eq('account_id', accountId);
  await supabase.from('merchant_category_rules').delete().eq('account_id', accountId);
  await supabase.from('merchant_mappings').delete().eq('account_id', accountId);
  await supabase.from('merchant_groups').delete().eq('account_id', accountId);
  await supabase.from('pending_checks').delete().eq('account_id', accountId);
  // pre_tax_deductions and income_settings tables may not exist (data stored in settings table)
  try {
    await supabase.from('pre_tax_deductions').delete().eq('account_id', accountId);
  } catch (error: any) {
    if (!error?.message?.includes('Could not find the table') && !error?.message?.includes('does not exist') && error?.code !== 'PGRST204') {
      throw error;
    }
  }
  try {
    await supabase.from('income_settings').delete().eq('account_id', accountId);
  } catch (error: any) {
    if (!error?.message?.includes('Could not find the table') && !error?.message?.includes('does not exist') && error?.code !== 'PGRST204') {
      throw error;
    }
  }
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
  const recurringTransactionIdMap = new Map<number, number>();

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

  // Insert tag_rules (after tags are inserted, remap tag_id)
  if (backupData.tag_rules && backupData.tag_rules.length > 0) {
    const tagRulesToInsert = backupData.tag_rules
      .map(({ id, account_id, user_id, tag_id, ...rule }) => ({
        ...rule,
        user_id: user.id,
        account_id: accountId,
        tag_id: tag_id ? (tagIdMap.get(tag_id) || null) : null,
      }))
      .filter(rule => rule.tag_id); // Only include rules with valid tag mappings

    if (tagRulesToInsert.length > 0) {
      const { error } = await supabase
        .from('tag_rules')
        .insert(tagRulesToInsert);

      if (error) {
        console.error('[Import] Error inserting tag rules:', error);
        throw error;
      }
      console.log('[Import] Inserted', tagRulesToInsert.length, 'tag rules');
    }
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

    if (backupData.transactions.length !== data.length) {
      console.error(`[Import] Mismatch: Expected ${backupData.transactions.length} transactions, got ${data.length} back from insert`);
    }
    backupData.transactions.forEach((oldTransaction, index) => {
      if (data[index]) {
        transactionIdMap.set(oldTransaction.id, data[index].id);
      } else {
        console.error(`[Import] Missing transaction data at index ${index} for transaction ID ${oldTransaction.id}`);
      }
    });
    console.log('[Import] Inserted', data.length, 'transactions');
    console.log('[Import] Transaction ID map size:', transactionIdMap.size, 'expected:', backupData.transactions.length);
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
  // Note: imported_transactions has UNIQUE(user_id, hash) constraint, so duplicates will fail
  if (backupData.imported_transactions && backupData.imported_transactions.length > 0) {
    const importedTransactionsToInsert = backupData.imported_transactions.map(({ id, account_id, user_id, ...importedTx }) => ({
      ...importedTx,
      user_id: user.id,
      account_id: accountId,
    }));

    let { data, error } = await supabase
      .from('imported_transactions')
      .insert(importedTransactionsToInsert)
      .select('id, hash');

    // Handle duplicate hash constraint violations
    if (error && error.code === '23505') {
      console.warn('[Import] Duplicate hashes detected in imported_transactions, filtering duplicates...');
      
      // Get existing hashes for this user
      const hashes = backupData.imported_transactions.map(tx => tx.hash).filter(h => h);
      const { data: existingHashes } = await supabase
        .from('imported_transactions')
        .select('id, hash')
        .eq('user_id', user.id)
        .in('hash', hashes);

      const existingHashSet = new Set(existingHashes?.map(h => h.hash) || []);
      const existingHashToIdMap = new Map(existingHashes?.map(h => [h.hash, h.id]) || []);

      // Filter out duplicates and retry
      const nonDuplicates: any[] = [];
      const duplicateIndices: number[] = [];
      
      backupData.imported_transactions.forEach((oldTx, index) => {
        if (existingHashSet.has(oldTx.hash)) {
          // Use existing imported_transaction ID for the map
          const existingId = existingHashToIdMap.get(oldTx.hash);
          if (existingId) {
            importedTransactionIdMap.set(oldTx.id, existingId);
            duplicateIndices.push(index);
          }
        } else {
          nonDuplicates.push(importedTransactionsToInsert[index]);
        }
      });

      if (nonDuplicates.length > 0) {
        const { data: newData, error: retryError } = await supabase
          .from('imported_transactions')
          .insert(nonDuplicates)
          .select('id, hash');

        if (retryError) {
          console.error('[Import] Error inserting non-duplicate imported transactions:', retryError);
          throw retryError;
        }

        // Map the new inserted transactions
        let newIndex = 0;
        backupData.imported_transactions.forEach((oldTx, index) => {
          if (!duplicateIndices.includes(index)) {
            if (newData && newData[newIndex]) {
              importedTransactionIdMap.set(oldTx.id, newData[newIndex].id);
            }
            newIndex++;
          }
        });

        console.log('[Import] Inserted', newData?.length || 0, 'new imported transactions, reused', duplicateIndices.length, 'existing ones');
        data = newData || [];
      } else {
        console.log('[Import] All imported transactions were duplicates, reusing existing ones');
        data = [];
      }
    } else if (error) {
      console.error('[Import] Error inserting imported transactions:', error);
      throw error;
    } else {
      // Success - map all IDs
      if (!data) {
        console.error('[Import] No data returned from imported_transactions insert');
        throw new Error('Failed to insert imported transactions: no data returned');
      }
      
      const insertedData = data;
      if (backupData.imported_transactions.length !== insertedData.length) {
        console.error(`[Import] Mismatch: Expected ${backupData.imported_transactions.length} imported transactions, got ${insertedData.length} back from insert`);
      }
      backupData.imported_transactions.forEach((oldImportedTx, index) => {
        if (insertedData[index]) {
          importedTransactionIdMap.set(oldImportedTx.id, insertedData[index].id);
        } else {
          console.error(`[Import] Missing imported transaction data at index ${index} for imported transaction ID ${oldImportedTx.id}`);
        }
      });
      console.log('[Import] Inserted', insertedData.length, 'imported transactions');
    }
    
    console.log('[Import] Imported transaction ID map size:', importedTransactionIdMap.size, 'expected:', backupData.imported_transactions.length);
  }

  // Insert imported transaction links (batch with remapped IDs)
  // Note: imported_transaction_links doesn't have account_id - it links imported_transactions (which have account_id)
  // to transactions (which have budget_account_id). Both are remapped above, and we remap the IDs here.
  if (backupData.imported_transaction_links && backupData.imported_transaction_links.length > 0) {
    console.log('[Import] Processing', backupData.imported_transaction_links.length, 'imported transaction links');
    
    // Build sets of valid IDs from backup data for validation
    const validTransactionIds = new Set(backupData.transactions?.map(t => t.id) || []);
    const validImportedTransactionIds = new Set(backupData.imported_transactions?.map(t => t.id) || []);
    
    console.log('[Import] Valid transaction IDs in backup:', validTransactionIds.size);
    console.log('[Import] Valid imported transaction IDs in backup:', validImportedTransactionIds.size);
    console.log('[Import] Transaction ID map size:', transactionIdMap.size);
    console.log('[Import] Imported transaction ID map size:', importedTransactionIdMap.size);
    
    const importedTransactionLinksToInsert = backupData.imported_transaction_links
      .map((link: any) => {
        // Extract only the actual column values, excluding relation fields and id
        // The export query includes relations (transactions, imported_transactions) which we need to exclude
        const { id, imported_transaction_id, transaction_id, transactions, imported_transactions, ...rest } = link;
        
        // First check if the IDs exist in the backup data (data integrity check)
        if (transaction_id && !validTransactionIds.has(transaction_id)) {
          console.warn(`[Import] Orphaned link: transaction_id ${transaction_id} not found in backup transactions`);
        }
        if (imported_transaction_id && !validImportedTransactionIds.has(imported_transaction_id)) {
          console.warn(`[Import] Orphaned link: imported_transaction_id ${imported_transaction_id} not found in backup imported_transactions`);
        }
        
        // Remap IDs: imported_transaction_id was remapped when imported_transactions were inserted (line 704)
        // and transaction_id was remapped when transactions were inserted (line 644)
        const newImportedTransactionId = imported_transaction_id ? (importedTransactionIdMap.get(imported_transaction_id) || null) : null;
        const newTransactionId = transaction_id ? (transactionIdMap.get(transaction_id) || null) : null;
        
        // Debug logging for missing mappings
        if (imported_transaction_id && !newImportedTransactionId) {
          console.warn(`[Import] Missing imported_transaction_id mapping: old ID ${imported_transaction_id} not found in map (exists in backup: ${validImportedTransactionIds.has(imported_transaction_id)})`);
        }
        if (transaction_id && !newTransactionId) {
          console.warn(`[Import] Missing transaction_id mapping: old ID ${transaction_id} not found in map (exists in backup: ${validTransactionIds.has(transaction_id)})`);
        }
        
        // Only include actual table columns: imported_transaction_id, transaction_id, and created_at (if present)
        return {
          imported_transaction_id: newImportedTransactionId,
          transaction_id: newTransactionId,
          // Include created_at if it exists in the backup (it's optional with a default)
          ...(rest.created_at ? { created_at: rest.created_at } : {}),
        };
      })
      .filter(link => {
        // Only include links that have both imported_transaction_id and transaction_id mapped successfully
        if (!link.imported_transaction_id || !link.transaction_id) {
          console.warn(`[Import] Skipping imported transaction link with missing mapping: imported_transaction_id=${link.imported_transaction_id}, transaction_id=${link.transaction_id}`);
          return false;
        }
        return true;
      });

    if (importedTransactionLinksToInsert.length === 0) {
      console.warn('[Import] No valid imported transaction links to insert after filtering');
    } else {
      const { error } = await supabase
        .from('imported_transaction_links')
        .insert(importedTransactionLinksToInsert);

      if (error) {
        console.error('[Import] Error inserting imported transaction links:', error);
        throw error;
      }
      console.log('[Import] Inserted', importedTransactionLinksToInsert.length, 'imported transaction links (filtered from', backupData.imported_transaction_links.length, 'total)');
    }
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

  // Insert recurring_transactions (after transactions, categories, accounts, credit_cards, merchant_groups are inserted)
  if (backupData.recurring_transactions && backupData.recurring_transactions.length > 0) {
    const recurringTransactionsToInsert = backupData.recurring_transactions.map(({ 
      id, 
      budget_account_id, 
      user_id, 
      merchant_group_id, 
      category_id, 
      account_id, 
      credit_card_id, 
      ...recurringTx 
    }) => ({
      ...recurringTx,
      user_id: user.id,
      budget_account_id: accountId,
      merchant_group_id: merchant_group_id ? (merchantGroupIdMap.get(merchant_group_id) || null) : null,
      category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
      account_id: account_id ? (accountIdMap.get(account_id) || null) : null,
      credit_card_id: credit_card_id ? (creditCardIdMap.get(credit_card_id) || null) : null,
    }));

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert(recurringTransactionsToInsert)
      .select('id');

    if (error) {
      console.error('[Import] Error inserting recurring transactions:', error);
      throw error;
    }

    if (backupData.recurring_transactions.length !== data.length) {
      console.error(`[Import] Mismatch: Expected ${backupData.recurring_transactions.length} recurring transactions, got ${data.length} back from insert`);
    }
    backupData.recurring_transactions.forEach((oldRecurringTx, index) => {
      if (data[index]) {
        recurringTransactionIdMap.set(oldRecurringTx.id, data[index].id);
      } else {
        console.warn(`[Import] Missing recurring transaction data at index ${index} for recurring transaction ID ${oldRecurringTx.id}`);
      }
    });
    console.log('[Import] Inserted', data.length, 'recurring transactions');
  }

  // Insert recurring_transaction_matches (after recurring_transactions and transactions are inserted)
  if (backupData.recurring_transaction_matches && backupData.recurring_transaction_matches.length > 0) {
    const recurringTransactionMatchesToInsert = backupData.recurring_transaction_matches
      .map(({ id, recurring_transaction_id, transaction_id, recurring_transactions, ...match }) => ({
        ...match,
        recurring_transaction_id: recurring_transaction_id ? (recurringTransactionIdMap.get(recurring_transaction_id) || null) : null,
        transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
      }))
      .filter(match => match.recurring_transaction_id && match.transaction_id); // Only include valid mappings

    if (recurringTransactionMatchesToInsert.length > 0) {
      const { error } = await supabase
        .from('recurring_transaction_matches')
        .insert(recurringTransactionMatchesToInsert);

      if (error) {
        console.error('[Import] Error inserting recurring transaction matches:', error);
        throw error;
      }
      console.log('[Import] Inserted', recurringTransactionMatchesToInsert.length, 'recurring transaction matches');
    }
  }

  // Insert notifications (after transactions are inserted, in case metadata references them)
  // Note: We only export account-scoped notifications (budget_account_id IS NOT NULL)
  // User-level notifications (budget_account_id IS NULL) are not included in account backups
  // All notifications in the backup should have budget_account_id set (from export filter)
  if (backupData.notifications && backupData.notifications.length > 0) {
    const notificationsToInsert = backupData.notifications
      .map(({ 
        id, 
        budget_account_id, 
        user_id, 
        ...notification 
      }) => ({
        ...notification,
        user_id: user.id, // Remap to current user (notifications are user-specific)
        budget_account_id: accountId, // Always set to target account (we only export account-scoped notifications)
        // Note: notification_type_id is a reference to notification_types table (lookup table)
        // We don't remap it as it's a reference table that should exist in the system
      }))
      .filter(notification => {
        // Ensure notification_type_id exists (should always be true, but safety check)
        // Also filter out any notifications that somehow have NULL budget_account_id (shouldn't happen, but safety)
        return notification.notification_type_id && accountId;
      });

    const { error } = await supabase
      .from('notifications')
      .insert(notificationsToInsert);

    if (error) {
      console.error('[Import] Error inserting notifications:', error);
      throw error;
    }
    console.log('[Import] Inserted', notificationsToInsert.length, 'notifications');
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
  // Note: income_settings table may not exist (data stored in settings table)
  if (backupData.income_settings && backupData.income_settings.length > 0) {
    try {
      const incomeSettingsToInsert = backupData.income_settings.map(({ id, account_id, user_id, ...income }) => ({
        ...income,
        user_id: user.id,
        account_id: accountId,
      }));

      const { error } = await supabase
        .from('income_settings')
        .insert(incomeSettingsToInsert);

      if (error) {
        // If table doesn't exist, skip (for backward compatibility)
        if (error.message?.includes('Could not find the table') || 
            error.message?.includes('does not exist') ||
            error.code === 'PGRST204') {
          console.warn('[Import] income_settings table does not exist, skipping (this is OK for older schemas)');
        } else {
          console.error('[Import] Error inserting income settings:', error);
          throw error;
        }
      } else {
        console.log('[Import] Inserted', incomeSettingsToInsert.length, 'income settings');
      }
    } catch (error: any) {
      if (error?.message?.includes('Could not find the table') || 
          error?.message?.includes('does not exist') ||
          error?.code === 'PGRST204') {
        console.warn('[Import] income_settings table does not exist, skipping (this is OK for older schemas)');
      } else {
        throw error;
      }
    }
  }

  // Insert pre-tax deductions (batch)
  // Note: pre_tax_deductions table may not exist (data stored in settings table as JSON)
  if (backupData.pre_tax_deductions && backupData.pre_tax_deductions.length > 0) {
    try {
      const preTaxDeductionsToInsert = backupData.pre_tax_deductions.map(({ id, account_id, user_id, ...deduction }) => ({
        ...deduction,
        user_id: user.id,
        account_id: accountId,
      }));

      const { error } = await supabase
        .from('pre_tax_deductions')
        .insert(preTaxDeductionsToInsert);

      if (error) {
        // If table doesn't exist, skip (for backward compatibility)
        if (error.message?.includes('Could not find the table') || 
            error.message?.includes('does not exist') ||
            error.code === 'PGRST204') {
          console.warn('[Import] pre_tax_deductions table does not exist, skipping (this is OK - data stored in settings table)');
        } else {
          console.error('[Import] Error inserting pre-tax deductions:', error);
          throw error;
        }
      } else {
        console.log('[Import] Inserted', preTaxDeductionsToInsert.length, 'pre-tax deductions');
      }
    } catch (error: any) {
      if (error?.message?.includes('Could not find the table') || 
          error?.message?.includes('does not exist') ||
          error?.code === 'PGRST204') {
        console.warn('[Import] pre_tax_deductions table does not exist, skipping (this is OK - data stored in settings table)');
      } else {
        throw error;
      }
    }
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

      // Sort transaction IDs for consistent comparison (required by unique constraint)
      const sortedTransactionIds = [...remappedTransactionIds].sort((a, b) => a - b);

      return {
        ...review,
        budget_account_id: accountId,
        transaction_ids: sortedTransactionIds,
        // Remap reviewed_by to current user (since we're importing to a different account, the original reviewer may not exist)
        reviewed_by: user.id, // Set to current importing user
      };
    }).filter(review => review.transaction_ids.length > 0); // Only include reviews with valid remapped transaction IDs

    if (duplicateGroupReviewsToInsert.length > 0) {
      // Check for existing duplicate_group_reviews to avoid constraint violations
      // The unique constraint is on (budget_account_id, transaction_ids)
      const transactionIdArrays = duplicateGroupReviewsToInsert.map(r => r.transaction_ids);
      const { data: existingReviews } = await supabase
        .from('duplicate_group_reviews')
        .select('transaction_ids')
        .eq('budget_account_id', accountId);

      const existingTransactionIdSets = new Set(
        (existingReviews || []).map((r: any) => JSON.stringify(r.transaction_ids.sort((a: number, b: number) => a - b)))
      );

      // Filter out reviews that already exist
      const newReviewsToInsert = duplicateGroupReviewsToInsert.filter(review => {
        const sortedIds = JSON.stringify(review.transaction_ids);
        return !existingTransactionIdSets.has(sortedIds);
      });

      // Also deduplicate within the backup data itself (in case multiple reviews map to same transaction_ids)
      const seenInBackup = new Set<string>();
      const deduplicatedReviews = newReviewsToInsert.filter(review => {
        const sortedIds = JSON.stringify(review.transaction_ids);
        if (seenInBackup.has(sortedIds)) {
          return false; // Duplicate within backup
        }
        seenInBackup.add(sortedIds);
        return true;
      });

      if (deduplicatedReviews.length > 0) {
        const { error } = await supabase
          .from('duplicate_group_reviews')
          .insert(deduplicatedReviews);

        if (error) {
          // If we still get a constraint violation, try upsert instead
          if (error.code === '23505') {
            console.warn('[Import] Duplicate constraint violation on duplicate_group_reviews, using upsert...');
            const upsertPromises = deduplicatedReviews.map(review =>
              supabase
                .from('duplicate_group_reviews')
                .upsert(review, {
                  onConflict: 'budget_account_id,transaction_ids',
                })
            );
            const results = await Promise.all(upsertPromises);
            const upsertErrors = results.filter(r => r.error).map(r => r.error);
            if (upsertErrors.length > 0) {
              console.error('[Import] Error upserting duplicate group reviews:', upsertErrors);
              throw upsertErrors[0];
            }
            console.log('[Import] Upserted', deduplicatedReviews.length, 'duplicate group reviews');
          } else {
            console.error('[Import] Error inserting duplicate group reviews:', error);
            throw error;
          }
        } else {
          console.log('[Import] Inserted', deduplicatedReviews.length, 'duplicate group reviews', 
            duplicateGroupReviewsToInsert.length !== deduplicatedReviews.length 
              ? `(filtered ${duplicateGroupReviewsToInsert.length - deduplicatedReviews.length} duplicates)`
              : '');
        }
      } else {
        console.log('[Import] All duplicate group reviews were duplicates, skipping insert');
      }
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
      // Remap created_by to current user (since we're importing to a different account, the original creator may not exist)
      created_by: user.id,
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
          // Remap reviewed_by to current user (since we're importing to a different account, the original reviewer may not exist)
          reviewed_by: user.id, // Set to current importing user
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

