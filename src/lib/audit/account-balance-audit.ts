import { getAuthenticatedUser } from '../supabase-queries';
import { getActiveAccountId } from '../account-context';

export type AccountChangeType =
  | 'manual_edit'
  | 'transaction_create'
  | 'transaction_update'
  | 'transaction_delete'
  | 'transaction_import'
  | 'transfer';

export type CreditCardChangeType =
  | 'manual_edit'
  | 'transaction_create'
  | 'transaction_update'
  | 'transaction_delete'
  | 'transaction_import'
  | 'payment';

export type LoanChangeType =
  | 'manual_edit'
  | 'payment'
  | 'interest_accrual'
  | 'principal_adjustment';

export type AssetChangeType =
  | 'manual_edit'
  | 'value_update'
  | 'appreciation'
  | 'depreciation';

export interface BalanceChangeMetadata {
  transaction_id?: number;
  transaction_description?: string;
  import_file_name?: string;
  [key: string]: any;
}

/**
 * Log an account balance change to the audit trail
 */
export async function logAccountBalanceChange(
  accountId: number,
  oldBalance: number,
  newBalance: number,
  changeType: AccountChangeType,
  metadata?: BalanceChangeMetadata
): Promise<void> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      console.warn('No active account found, skipping audit log');
      return;
    }

    const changeAmount = newBalance - oldBalance;

    // Skip logging if there's no actual change
    if (Math.abs(changeAmount) < 0.01) {
      return;
    }

    const { error } = await supabase
      .from('account_balance_audit')
      .insert({
        account_id: accountId,
        budget_account_id: budgetAccountId,
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
      console.error('Failed to log account balance change:', error);
    }
  } catch (error) {
    console.error('Error logging account balance change:', error);
  }
}

/**
 * Log a credit card available credit change to the audit trail
 * Note: We track available_credit, not current_balance
 */
export async function logCreditCardBalanceChange(
  creditCardId: number,
  oldAvailableCredit: number,
  newAvailableCredit: number,
  changeType: CreditCardChangeType,
  metadata?: BalanceChangeMetadata
): Promise<void> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      console.warn('No active account found, skipping audit log');
      return;
    }

    const changeAmount = newAvailableCredit - oldAvailableCredit;

    // Skip logging if there's no actual change
    if (Math.abs(changeAmount) < 0.01) {
      return;
    }

    const { error } = await supabase
      .from('credit_card_balance_audit')
      .insert({
        credit_card_id: creditCardId,
        budget_account_id: budgetAccountId,
        user_id: user.id,
        old_available_credit: oldAvailableCredit,
        new_available_credit: newAvailableCredit,
        change_amount: changeAmount,
        change_type: changeType,
        transaction_id: metadata?.transaction_id || null,
        description: metadata?.transaction_description || null,
        metadata: metadata || null,
      });

    if (error) {
      console.error('Failed to log credit card balance change:', error);
    }
  } catch (error) {
    console.error('Error logging credit card balance change:', error);
  }
}

/**
 * Log a loan balance change to the audit trail
 */
export async function logLoanBalanceChange(
  loanId: number,
  oldBalance: number,
  newBalance: number,
  changeType: LoanChangeType,
  metadata?: BalanceChangeMetadata
): Promise<void> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      console.warn('No active account found, skipping audit log');
      return;
    }

    const changeAmount = newBalance - oldBalance;

    // Skip logging if there's no actual change
    if (Math.abs(changeAmount) < 0.01) {
      return;
    }

    const { error } = await supabase
      .from('loan_balance_audit')
      .insert({
        loan_id: loanId,
        budget_account_id: budgetAccountId,
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
      console.error('Failed to log loan balance change:', error);
    }
  } catch (error) {
    console.error('Error logging loan balance change:', error);
  }
}

/**
 * Log an asset value change to the audit trail
 */
export async function logAssetValueChange(
  assetId: number,
  oldValue: number,
  newValue: number,
  changeType: AssetChangeType,
  metadata?: BalanceChangeMetadata
): Promise<void> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      console.warn('No active account found, skipping audit log');
      return;
    }

    const changeAmount = newValue - oldValue;

    // Skip logging if there's no actual change
    if (Math.abs(changeAmount) < 0.01) {
      return;
    }

    const { error } = await supabase
      .from('asset_value_audit')
      .insert({
        asset_id: assetId,
        budget_account_id: budgetAccountId,
        user_id: user.id,
        old_value: oldValue,
        new_value: newValue,
        change_amount: changeAmount,
        change_type: changeType,
        description: metadata?.transaction_description || null,
        metadata: metadata || null,
      });

    if (error) {
      console.error('Failed to log asset value change:', error);
    }
  } catch (error) {
    console.error('Error logging asset value change:', error);
  }
}

/**
 * Create a net worth snapshot for the current date
 */
export async function createNetWorthSnapshot(): Promise<void> {
  try {
    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      console.warn('No active account found, skipping net worth snapshot');
      return;
    }

    // Get all accounts (only those included in totals)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance, include_in_totals')
      .eq('account_id', budgetAccountId);

    // Get all credit cards (only those included in totals)
    const { data: creditCards } = await supabase
      .from('credit_cards')
      .select('current_balance, include_in_totals')
      .eq('account_id', budgetAccountId);

    // Get all loans
    const { data: loans } = await supabase
      .from('loans')
      .select('balance')
      .eq('account_id', budgetAccountId);

    // Get all assets
    const { data: assets } = await supabase
      .from('non_cash_assets')
      .select('current_value')
      .eq('account_id', budgetAccountId);

    // Calculate totals
    const totalAccounts = (accounts || [])
      .filter(acc => acc.include_in_totals === true)
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

    const totalCreditCards = (creditCards || [])
      .filter(cc => cc.include_in_totals === true)
      .reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);

    const totalLoans = (loans || [])
      .reduce((sum, loan) => sum + Number(loan.current_balance || 0), 0);

    const totalAssets = (assets || [])
      .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);

    // Net worth = accounts + assets - credit cards - loans
    const netWorth = totalAccounts + totalAssets - totalCreditCards - totalLoans;

    const today = new Date().toISOString().split('T')[0];

    // Upsert snapshot for today
    const { error } = await supabase
      .from('net_worth_snapshots')
      .upsert({
        budget_account_id: budgetAccountId,
        snapshot_date: today,
        total_accounts: totalAccounts,
        total_credit_cards: totalCreditCards,
        total_loans: totalLoans,
        total_assets: totalAssets,
        net_worth: netWorth,
      }, {
        onConflict: 'budget_account_id,snapshot_date'
      });

    if (error) {
      console.error('Failed to create net worth snapshot:', error);
    }
  } catch (error) {
    console.error('Error creating net worth snapshot:', error);
  }
}
