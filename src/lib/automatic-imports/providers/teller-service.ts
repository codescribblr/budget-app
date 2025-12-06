/**
 * Teller Integration Service
 * Handles fetching transactions from Teller API and queuing them
 */

import { queueTransactions } from '../queue-manager';
import type { ParsedTransaction } from '../../import-types';
import { generateTransactionHash } from '../../csv-parser';
import { extractMerchant } from '../../csv-parser-helpers';

export interface TellerTransaction {
  id: string;
  account_id: string;
  amount: string; // Signed amount as string (positive or negative)
  date: string; // ISO 8601 date
  description: string;
  status: 'posted' | 'pending';
  type: string; // e.g., 'card_payment', 'transfer', etc.
  details?: {
    category?: string;
    counterparty?: {
      name?: string;
      type?: string;
    };
    processing_status?: 'pending' | 'complete';
  };
  running_balance?: string | null;
}

export interface TellerAccount {
  id: string;
  name: string;
  type: string;
  institution: {
    id: string;
    name: string;
  };
  account_number?: {
    number?: string;
  };
}

/**
 * Fetch transactions from Teller API for an account
 */
export async function fetchTellerTransactions(
  accessToken: string,
  accountId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    count?: number;
  }
): Promise<TellerTransaction[]> {
  const baseUrl = process.env.TELLER_ENV === 'production' 
    ? 'https://api.teller.io'
    : 'https://api.teller.io'; // Teller uses same URL for sandbox/production

  const params = new URLSearchParams();
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);
  if (options?.count) params.append('count', options.count.toString());

  const url = `${baseUrl}/accounts/${accountId}/transactions${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Teller API error: ${response.status} ${errorText}`);
  }

  const transactions = await response.json();
  return transactions as TellerTransaction[];
}

/**
 * Fetch account details from Teller API
 */
export async function fetchTellerAccount(
  accessToken: string,
  accountId: string
): Promise<TellerAccount> {
  const baseUrl = process.env.TELLER_ENV === 'production'
    ? 'https://api.teller.io'
    : 'https://api.teller.io';

  const response = await fetch(`${baseUrl}/accounts/${accountId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Teller API error: ${response.status} ${errorText}`);
  }

  return await response.json() as TellerAccount;
}

/**
 * Fetch all accounts for an access token
 */
export async function fetchTellerAccounts(accessToken: string): Promise<TellerAccount[]> {
  const baseUrl = process.env.TELLER_ENV === 'production'
    ? 'https://api.teller.io'
    : 'https://api.teller.io';

  const response = await fetch(`${baseUrl}/accounts`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Teller API error: ${response.status} ${errorText}`);
  }

  return await response.json() as TellerAccount[];
}

/**
 * Convert Teller transaction to ParsedTransaction format
 */
export function convertTellerTransactionToParsed(
  tellerTransaction: TellerTransaction,
  accountId?: number,
  creditCardId?: number
): ParsedTransaction {
  const parsedAmount = parseFloat(tellerTransaction.amount);
  if (isNaN(parsedAmount)) {
    throw new Error(`Invalid transaction amount: ${tellerTransaction.amount}`);
  }
  const amount = Math.abs(parsedAmount);
  const isIncome = parsedAmount > 0;
  
  // Extract merchant from description or counterparty
  const merchant = tellerTransaction.details?.counterparty?.name 
    || extractMerchant(tellerTransaction.description)
    || tellerTransaction.description;

  // Generate hash for deduplication
  const hash = generateTransactionHash(
    tellerTransaction.date,
    tellerTransaction.description,
    amount
  );

  return {
    id: `teller-${tellerTransaction.id}`,
    date: tellerTransaction.date,
    description: tellerTransaction.description,
    merchant,
    amount,
    transaction_type: isIncome ? 'income' : 'expense',
    originalData: JSON.stringify(tellerTransaction),
    hash,
    account_id: accountId,
    credit_card_id: creditCardId,
    isDuplicate: false,
    status: 'pending',
    splits: [], // Will be filled during review
  };
}

/**
 * Fetch and queue Teller transactions for an import setup
 */
export async function fetchAndQueueTellerTransactions(options: {
  importSetupId: number;
  accessToken: string;
  accountId: string; // Teller account ID
  isHistorical?: boolean;
  startDate?: string;
  endDate?: string;
  supabase?: any; // Optional Supabase client for webhook contexts
  budgetAccountId?: number; // Optional budget account ID for webhook contexts
}): Promise<{
  fetched: number;
  queued: number;
  errors: string[];
}> {
  const { importSetupId, accessToken, accountId, isHistorical, startDate, endDate, supabase: providedSupabase, budgetAccountId } = options;
  const errors: string[] = [];
  
  try {
    // Get supabase client and account_id
    let supabase = providedSupabase;
    let setupAccountId = budgetAccountId;
    let actualIsHistorical = isHistorical;
    let targetAccountId: number | null = null;
    let targetCreditCardId: number | null = null;

    // Fetch setup to get account_id, is_historical, and account mappings
    if (!supabase || !setupAccountId) {
      if (!supabase) {
        const { getAuthenticatedUser } = await import('../../supabase-queries');
        const auth = await getAuthenticatedUser();
        supabase = auth.supabase;
      }

      const { data: setup, error: setupError } = await supabase
        .from('automatic_import_setups')
        .select('account_id, is_historical, target_account_id, target_credit_card_id')
        .eq('id', importSetupId)
        .single();
      
      if (setupError || !setup) {
        throw new Error(`Import setup ${importSetupId} not found`);
      }
      
      setupAccountId = setup.account_id;
      if (actualIsHistorical === undefined) {
        actualIsHistorical = setup.is_historical;
      }
      targetAccountId = setup.target_account_id;
      targetCreditCardId = setup.target_credit_card_id;
    } else {
      // If supabase and accountId provided, still fetch setup for account mappings
      const { data: setup, error: setupError } = await supabase
        .from('automatic_import_setups')
        .select('target_account_id, target_credit_card_id')
        .eq('id', importSetupId)
        .single();
      
      if (setupError) {
        console.warn(`Error fetching setup ${importSetupId} for account mappings:`, setupError);
        // Continue with null values - account mappings are optional
      } else if (setup) {
        targetAccountId = setup.target_account_id;
        targetCreditCardId = setup.target_credit_card_id;
      }
    }

    if (!setupAccountId) {
      throw new Error('Could not determine budget account ID');
    }

    // Fetch transactions from Teller
    const transactions = await fetchTellerTransactions(accessToken, accountId, {
      startDate,
      endDate,
    });

    if (transactions.length === 0) {
      return { fetched: 0, queued: 0, errors: [] };
    }

    // Convert to ParsedTransaction format with account mapping
    const parsedTransactions = transactions.map(txn => 
      convertTellerTransactionToParsed(txn, targetAccountId || undefined, targetCreditCardId || undefined)
    );

    // Generate batch ID
    const sourceBatchId = `teller-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Queue transactions
    const queued = await queueTransactions({
      importSetupId,
      transactions: parsedTransactions,
      sourceBatchId,
      isHistorical: actualIsHistorical || false,
      accountId: setupAccountId,
      supabase,
    });

    return {
      fetched: transactions.length,
      queued,
      errors,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    errors.push(`Error fetching Teller transactions: ${errorMessage}`);
    console.error('Error fetching Teller transactions:', error);
    return {
      fetched: 0,
      queued: 0,
      errors,
    };
  }
}
