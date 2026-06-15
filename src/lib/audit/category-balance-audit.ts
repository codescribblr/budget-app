import { getAuthenticatedUser } from '../supabase-queries';
import { getActiveAccountId } from '../account-context';

export type BalanceChangeType =
  | 'transaction_create'
  | 'transaction_update'
  | 'transaction_delete'
  | 'transaction_import'
  | 'allocation_batch'
  | 'allocation_manual'
  | 'allocation_income'
  | 'transfer_from'
  | 'transfer_to'
  | 'manual_edit'
  | 'transaction_merge'
  | 'income_buffer_fund';

export interface BalanceChangeMetadata {
  transaction_id?: number;
  transaction_description?: string;
  import_file_name?: string;
  transfer_category_id?: number;
  transfer_category_name?: string;
  allocation_month?: string;
  [key: string]: any;
}

/**
 * Log a balance change to the audit trail
 * @param categoryId - The category whose balance changed
 * @param oldBalance - The balance before the change
 * @param newBalance - The balance after the change
 * @param changeType - The type of change that occurred
 * @param metadata - Additional context about the change
 */
export async function logBalanceChange(
  categoryId: number,
  oldBalance: number,
  newBalance: number,
  changeType: BalanceChangeType,
  metadata?: BalanceChangeMetadata
): Promise<void> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      console.warn('No active account found, skipping audit log');
      return;
    }

    const changeAmount = newBalance - oldBalance;

    // Skip logging if there's no actual change
    if (Math.abs(changeAmount) < 0.01) {
      return;
    }

    const { error } = await supabase
      .from('category_balance_audit')
      .insert({
        category_id: categoryId,
        account_id: accountId,
        user_id: user.id,
        old_balance: oldBalance,
        new_balance: newBalance,
        change_amount: changeAmount,
        change_type: changeType,
        transaction_id: metadata?.transaction_id || null,
        description: metadata?.transaction_description || null,
        metadata: metadata || null,
      });

    if (error) {
      // Log error but don't throw - audit logging should not break the main operation
      console.error('Failed to log balance change:', error);
    }
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Error logging balance change:', error);
  }
}

/**
 * Log multiple balance changes in a batch
 * Useful for operations that affect multiple categories at once
 */
export async function logBalanceChanges(
  changes: Array<{
    categoryId: number;
    oldBalance: number;
    newBalance: number;
    changeType: BalanceChangeType;
    metadata?: BalanceChangeMetadata;
  }>
): Promise<void> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      console.warn('No active account found, skipping audit log');
      return;
    }

    const auditRecords = changes
      .filter(change => {
        const changeAmount = change.newBalance - change.oldBalance;
        return Math.abs(changeAmount) >= 0.01; // Only log actual changes
      })
      .map(change => ({
        category_id: change.categoryId,
        account_id: accountId,
        user_id: user.id,
        old_balance: change.oldBalance,
        new_balance: change.newBalance,
        change_amount: change.newBalance - change.oldBalance,
        change_type: change.changeType,
        transaction_id: change.metadata?.transaction_id || null,
        description: change.metadata?.transaction_description || null,
        metadata: change.metadata || null,
      }));

    if (auditRecords.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('category_balance_audit')
      .insert(auditRecords);

    if (error) {
      console.error('Failed to log balance changes:', error);
    }
  } catch (error) {
    console.error('Error logging balance changes:', error);
  }
}
