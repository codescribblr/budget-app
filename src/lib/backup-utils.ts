import { getAuthenticatedUser } from './supabase-queries';

export interface UserBackupData {
  version: string;
  created_at: string;
  accounts: any[];
  categories: any[];
  credit_cards: any[];
  loans?: any[]; // Added in version 1.2
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
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('categories').select('*').eq('user_id', user.id),
    supabase.from('credit_cards').select('*').eq('user_id', user.id),
    supabase.from('loans').select('*').eq('user_id', user.id),
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
    version: '1.2',
    created_at: new Date().toISOString(),
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
  await supabase.from('goals').delete().eq('user_id', user.id); // Delete before categories, accounts, credit_cards, and loans (goals depend on these)
  await supabase.from('loans').delete().eq('user_id', user.id);
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

  if (backupData.loans && backupData.loans.length > 0) {
    await supabase.from('loans').insert(backupData.loans);
  }

  // Insert goals after categories, accounts, credit_cards, and loans
  // Goals depend on: categories (envelope goals), accounts (account-linked goals), credit_cards (debt-paydown goals), loans (loan-paydown goals)
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
  await supabase.from('categories').delete().eq('user_id', user.id);
  await supabase.from('accounts').delete().eq('user_id', user.id);

  console.log('[Import] Deleted existing user data');

  // Step 2: Insert data and build ID mappings
  const accountIdMap = new Map<number, number>();
  const categoryIdMap = new Map<number, number>();
  const creditCardIdMap = new Map<number, number>();
  const loanIdMap = new Map<number, number>();
  const transactionIdMap = new Map<number, number>();
  const merchantGroupIdMap = new Map<number, number>();
  const importedTransactionIdMap = new Map<number, number>();

  // Insert accounts
  if (backupData.accounts && backupData.accounts.length > 0) {
    for (const account of backupData.accounts) {
      const oldId = account.id;
      const { id, ...accountData } = account;
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...accountData, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting account:', error);
        throw error;
      }
      accountIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted accounts, ID map:', Object.fromEntries(accountIdMap));
  }

  // Insert categories
  if (backupData.categories && backupData.categories.length > 0) {
    for (const category of backupData.categories) {
      const oldId = category.id;
      const { id, ...categoryData } = category;
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...categoryData, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting category:', error);
        throw error;
      }
      categoryIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted categories, ID map:', Object.fromEntries(categoryIdMap));
  }

  // Insert credit cards
  if (backupData.credit_cards && backupData.credit_cards.length > 0) {
    for (const creditCard of backupData.credit_cards) {
      const oldId = creditCard.id;
      const { id, ...creditCardData } = creditCard;
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...creditCardData, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting credit card:', error);
        throw error;
      }
      creditCardIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted credit cards, ID map:', Object.fromEntries(creditCardIdMap));
  }

  // Insert loans
  if (backupData.loans && backupData.loans.length > 0) {
    for (const loan of backupData.loans) {
      const oldId = loan.id;
      const { id, ...loanData } = loan;
      const { data, error } = await supabase
        .from('loans')
        .insert({ ...loanData, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting loan:', error);
        throw error;
      }
      loanIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted loans, ID map:', Object.fromEntries(loanIdMap));
  }

  // Insert goals (with remapped foreign keys)
  if (backupData.goals && backupData.goals.length > 0) {
    for (const goal of backupData.goals) {
      const { id, linked_account_id, linked_category_id, linked_credit_card_id, linked_loan_id, ...goalData } = goal;

      const remappedGoal: any = {
        ...goalData,
        user_id: user.id,
        linked_account_id: linked_account_id ? (accountIdMap.get(linked_account_id) || null) : null,
        linked_category_id: linked_category_id ? (categoryIdMap.get(linked_category_id) || null) : null,
        linked_credit_card_id: linked_credit_card_id ? (creditCardIdMap.get(linked_credit_card_id) || null) : null,
        linked_loan_id: linked_loan_id ? (loanIdMap.get(linked_loan_id) || null) : null,
      };

      const { error } = await supabase
        .from('goals')
        .insert(remappedGoal);

      if (error) {
        console.error('[Import] Error inserting goal:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted goals');
  }

  // Insert merchant groups
  if (backupData.merchant_groups && backupData.merchant_groups.length > 0) {
    for (const group of backupData.merchant_groups) {
      const oldId = group.id;
      const { id, ...groupData } = group;
      const { data, error } = await supabase
        .from('merchant_groups')
        .insert({ ...groupData, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting merchant group:', error);
        throw error;
      }
      merchantGroupIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted merchant groups');
  }

  // Insert merchant mappings (with remapped category_id)
  if (backupData.merchant_mappings && backupData.merchant_mappings.length > 0) {
    for (const mapping of backupData.merchant_mappings) {
      const { id, category_id, ...mappingData } = mapping;
      const { error } = await supabase
        .from('merchant_mappings')
        .insert({
          ...mappingData,
          user_id: user.id,
          category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
        });

      if (error) {
        console.error('[Import] Error inserting merchant mapping:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted merchant mappings');
  }

  // Insert merchant category rules (with remapped merchant_group_id and category_id)
  if (backupData.merchant_category_rules && backupData.merchant_category_rules.length > 0) {
    for (const rule of backupData.merchant_category_rules) {
      const { id, merchant_group_id, category_id, ...ruleData } = rule;
      const { error } = await supabase
        .from('merchant_category_rules')
        .insert({
          ...ruleData,
          user_id: user.id,
          merchant_group_id: merchant_group_id ? (merchantGroupIdMap.get(merchant_group_id) || null) : null,
          category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
        });

      if (error) {
        console.error('[Import] Error inserting merchant category rule:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted merchant category rules');
  }

  // Insert transactions (with remapped foreign keys)
  if (backupData.transactions && backupData.transactions.length > 0) {
    for (const transaction of backupData.transactions) {
      const oldId = transaction.id;
      const { id, merchant_group_id, account_id, credit_card_id, ...transactionData } = transaction;

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          user_id: user.id,
          merchant_group_id: merchant_group_id ? (merchantGroupIdMap.get(merchant_group_id) || null) : null,
          account_id: account_id ? (accountIdMap.get(account_id) || null) : null,
          credit_card_id: credit_card_id ? (creditCardIdMap.get(credit_card_id) || null) : null,
        })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting transaction:', error);
        throw error;
      }
      transactionIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted transactions');
  }

  // Insert transaction splits (with remapped transaction_id and category_id)
  if (backupData.transaction_splits && backupData.transaction_splits.length > 0) {
    for (const split of backupData.transaction_splits) {
      const { id, transaction_id, category_id, transactions, ...splitData } = split;
      const { error } = await supabase
        .from('transaction_splits')
        .insert({
          ...splitData,
          transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
          category_id: category_id ? (categoryIdMap.get(category_id) || null) : null,
        });

      if (error) {
        console.error('[Import] Error inserting transaction split:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted transaction splits');
  }

  // Insert imported transactions
  if (backupData.imported_transactions && backupData.imported_transactions.length > 0) {
    for (const importedTx of backupData.imported_transactions) {
      const oldId = importedTx.id;
      const { id, ...importedTxData } = importedTx;
      const { data, error } = await supabase
        .from('imported_transactions')
        .insert({ ...importedTxData, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[Import] Error inserting imported transaction:', error);
        throw error;
      }
      importedTransactionIdMap.set(oldId, data.id);
    }
    console.log('[Import] Inserted imported transactions');
  }

  // Insert imported transaction links (with remapped IDs)
  if (backupData.imported_transaction_links && backupData.imported_transaction_links.length > 0) {
    for (const link of backupData.imported_transaction_links) {
      const { id, imported_transaction_id, transaction_id, imported_transactions, ...linkData } = link;
      const { error } = await supabase
        .from('imported_transaction_links')
        .insert({
          ...linkData,
          imported_transaction_id: imported_transaction_id ? (importedTransactionIdMap.get(imported_transaction_id) || null) : null,
          transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
        });

      if (error) {
        console.error('[Import] Error inserting imported transaction link:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted imported transaction links');
  }

  // Insert pending checks
  if (backupData.pending_checks && backupData.pending_checks.length > 0) {
    for (const check of backupData.pending_checks) {
      const { id, ...checkData } = check;
      const { error } = await supabase
        .from('pending_checks')
        .insert({ ...checkData, user_id: user.id });

      if (error) {
        console.error('[Import] Error inserting pending check:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted pending checks');
  }

  // Insert income settings
  if (backupData.income_settings && backupData.income_settings.length > 0) {
    for (const income of backupData.income_settings) {
      const { id, ...incomeData } = income;
      const { error } = await supabase
        .from('income_settings')
        .insert({ ...incomeData, user_id: user.id });

      if (error) {
        console.error('[Import] Error inserting income setting:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted income settings');
  }

  // Insert pre-tax deductions
  if (backupData.pre_tax_deductions && backupData.pre_tax_deductions.length > 0) {
    for (const deduction of backupData.pre_tax_deductions) {
      const { id, ...deductionData } = deduction;
      const { error } = await supabase
        .from('pre_tax_deductions')
        .insert({ ...deductionData, user_id: user.id });

      if (error) {
        console.error('[Import] Error inserting pre-tax deduction:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted pre-tax deductions');
  }

  // Insert settings
  if (backupData.settings && backupData.settings.length > 0) {
    for (const setting of backupData.settings) {
      const { id, ...settingData } = setting;
      const { error } = await supabase
        .from('settings')
        .insert({ ...settingData, user_id: user.id });

      if (error) {
        console.error('[Import] Error inserting setting:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted settings');
  }

  // Insert CSV import templates
  if (backupData.csv_import_templates && backupData.csv_import_templates.length > 0) {
    for (const template of backupData.csv_import_templates) {
      const { id, ...templateData } = template;
      const { error } = await supabase
        .from('csv_import_templates')
        .insert({ ...templateData, user_id: user.id });

      if (error) {
        console.error('[Import] Error inserting CSV import template:', error);
        throw error;
      }
    }
    console.log('[Import] Inserted CSV import templates');
  }

  console.log('[Import] Import completed successfully');
}

