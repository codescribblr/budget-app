import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackupDataType } from './backup-data-types';

async function safeDelete(
  operation: () => PromiseLike<{ error: unknown }>,
  tableName: string
): Promise<void> {
  try {
    const { error } = await operation();
    if (error) {
      const err = error as { message?: string; code?: string };
      if (
        err.message?.includes('Could not find the table') ||
        err.message?.includes('does not exist') ||
        err.code === 'PGRST204'
      ) {
        console.warn(`[Import] Table '${tableName}' does not exist, skipping delete`);
        return;
      }
      throw error;
    }
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (
      err.message?.includes('Could not find the table') ||
      err.message?.includes('does not exist') ||
      err.code === 'PGRST204'
    ) {
      console.warn(`[Import] Table '${tableName}' does not exist, skipping delete`);
      return;
    }
    throw error;
  }
}

/**
 * Delete only the data types being selectively imported.
 * Order respects foreign key dependencies (children before parents).
 */
export async function deleteSelectedBackupDataTypes(
  supabase: SupabaseClient,
  accountId: number,
  selectedTypes: Set<BackupDataType>
): Promise<void> {
  const has = (type: BackupDataType) => selectedTypes.has(type);

  const { data: accountTransactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('budget_account_id', accountId);
  const transactionIds = accountTransactions?.map((t) => t.id) || [];

  const { data: accountImportedTransactions } = await supabase
    .from('imported_transactions')
    .select('id')
    .eq('account_id', accountId);
  const importedTransactionIds = accountImportedTransactions?.map((t) => t.id) || [];

  const { data: recurringTransactions } = await supabase
    .from('recurring_transactions')
    .select('id')
    .eq('budget_account_id', accountId);
  const recurringTransactionIds = recurringTransactions?.map((rt) => rt.id) || [];

  if (
    transactionIds.length > 0 &&
    (has('transaction_tags') ||
      has('transaction_splits') ||
      has('recurring_transaction_matches') ||
      has('transactions') ||
      has('imported_transaction_links') ||
      has('duplicate_group_reviews') ||
      has('category_balance_audit') ||
      has('account_balance_audit') ||
      has('credit_card_balance_audit') ||
      has('loan_balance_audit'))
  ) {
    if (
      has('transaction_tags') ||
      has('tags') ||
      has('transactions')
    ) {
      await supabase.from('transaction_tags').delete().in('transaction_id', transactionIds);
    }
    if (has('transaction_splits') || has('transactions')) {
      await supabase.from('transaction_splits').delete().in('transaction_id', transactionIds);
    }
    if (has('recurring_transaction_matches') || has('recurring_transactions') || has('transactions')) {
      await supabase.from('recurring_transaction_matches').delete().in('transaction_id', transactionIds);
    }
  }

  if (
    importedTransactionIds.length > 0 &&
    (has('imported_transaction_links') || has('imported_transactions'))
  ) {
    await supabase
      .from('imported_transaction_links')
      .delete()
      .in('imported_transaction_id', importedTransactionIds);
  }

  if (has('tag_rules') || has('tags')) {
    await supabase.from('tag_rules').delete().eq('account_id', accountId);
  }
  if (has('tags')) {
    await supabase.from('tags').delete().eq('account_id', accountId);
  }

  if (has('recurring_transactions')) {
    if (recurringTransactionIds.length > 0) {
      await supabase
        .from('recurring_transaction_matches')
        .delete()
        .in('recurring_transaction_id', recurringTransactionIds);
    }
    await supabase.from('recurring_transactions').delete().eq('budget_account_id', accountId);
  }

  if (has('notifications')) {
    await supabase.from('notifications').delete().eq('budget_account_id', accountId);
  }

  if (has('account_balance_audit')) {
    await safeDelete(
      () => supabase.from('account_balance_audit').delete().eq('budget_account_id', accountId),
      'account_balance_audit'
    );
  }
  if (has('credit_card_balance_audit')) {
    await safeDelete(
      () => supabase.from('credit_card_balance_audit').delete().eq('budget_account_id', accountId),
      'credit_card_balance_audit'
    );
  }
  if (has('loan_balance_audit')) {
    await safeDelete(
      () => supabase.from('loan_balance_audit').delete().eq('budget_account_id', accountId),
      'loan_balance_audit'
    );
  }
  if (has('asset_value_audit')) {
    await safeDelete(
      () => supabase.from('asset_value_audit').delete().eq('budget_account_id', accountId),
      'asset_value_audit'
    );
  }
  if (has('non_cash_assets')) {
    await safeDelete(
      () => supabase.from('non_cash_assets').delete().eq('account_id', accountId),
      'non_cash_assets'
    );
  }
  if (has('net_worth_snapshots')) {
    await safeDelete(
      () => supabase.from('net_worth_snapshots').delete().eq('budget_account_id', accountId),
      'net_worth_snapshots'
    );
  }

  if (has('transactions')) {
    await supabase.from('transactions').delete().eq('budget_account_id', accountId);
  }
  if (has('imported_transactions')) {
    await supabase.from('imported_transactions').delete().eq('account_id', accountId);
  }
  if (has('merchant_category_rules') || has('merchant_groups')) {
    await supabase.from('merchant_category_rules').delete().eq('account_id', accountId);
  }
  if (has('merchant_mappings') || has('merchant_groups')) {
    await supabase.from('merchant_mappings').delete().eq('account_id', accountId);
  }
  if (has('merchant_groups')) {
    await supabase.from('merchant_groups').delete().eq('account_id', accountId);
  }
  if (has('pending_checks')) {
    await supabase.from('pending_checks').delete().eq('account_id', accountId);
  }
  if (has('pre_tax_deductions')) {
    await safeDelete(
      () => supabase.from('pre_tax_deductions').delete().eq('account_id', accountId),
      'pre_tax_deductions'
    );
  }
  if (has('income_settings')) {
    await safeDelete(
      () => supabase.from('income_settings').delete().eq('account_id', accountId),
      'income_settings'
    );
  }
  if (has('income_streams')) {
    await safeDelete(
      () => supabase.from('income_streams').delete().eq('account_id', accountId),
      'income_streams'
    );
  }
  if (has('settings')) {
    await supabase.from('settings').delete().eq('account_id', accountId);
  }
  if (has('csv_import_templates')) {
    await supabase.from('csv_import_templates').delete().eq('account_id', accountId);
  }
  if (has('goals')) {
    await supabase.from('goals').delete().eq('account_id', accountId);
  }
  if (has('loans')) {
    await supabase.from('loans').delete().eq('account_id', accountId);
  }
  if (has('credit_cards')) {
    await supabase.from('credit_cards').delete().eq('account_id', accountId);
  }
  if (has('category_monthly_funding') || has('categories')) {
    await supabase.from('category_monthly_funding').delete().eq('account_id', accountId);
  }
  if (has('user_feature_flags')) {
    await supabase.from('user_feature_flags').delete().eq('account_id', accountId);
  }
  if (has('ai_conversations')) {
    await supabase.from('ai_conversations').delete().eq('account_id', accountId);
  }
  if (has('duplicate_group_reviews')) {
    await supabase.from('duplicate_group_reviews').delete().eq('budget_account_id', accountId);
  }
  if (has('queued_imports') || has('automatic_import_setups')) {
    await supabase.from('queued_imports').delete().eq('account_id', accountId);
  }
  if (has('automatic_import_setups')) {
    await supabase.from('automatic_import_setups').delete().eq('account_id', accountId);
  }
  if (has('category_balance_audit') || has('categories')) {
    await supabase.from('category_balance_audit').delete().eq('account_id', accountId);
  }
  if (has('categories')) {
    await supabase.from('categories').delete().eq('account_id', accountId);
  }
  if (has('accounts')) {
    await supabase.from('accounts').delete().eq('account_id', accountId);
  }
}
