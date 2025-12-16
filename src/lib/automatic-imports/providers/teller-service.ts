/**
 * Teller Integration Service
 * Handles fetching transactions from Teller API and queuing them
 */

import { Agent } from 'undici';
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
  currency?: string; // ISO 4217 currency code (e.g., "USD")
  institution: {
    id: string;
    name: string;
  };
  account_number?: {
    number?: string;
  };
}

/**
 * Create HTTPS agent with Teller client certificate for mTLS authentication
 * Teller requires mutual TLS (mTLS) for API requests in development/production
 * Uses undici Agent which supports mTLS and works with Node.js fetch
 * 
 * Environments:
 * - sandbox: Certificates optional (for testing with fake credentials)
 * - development: Certificates required (for testing real credentials on live site)
 * - production: Certificates required (for live production use)
 */
function createTellerHttpsAgent(): Agent | undefined {
  const cert = process.env.TELLER_CLIENT_CERT;
  const key = process.env.TELLER_CLIENT_KEY;

  // In sandbox, certificates are optional
  if (process.env.TELLER_ENV === 'sandbox' && (!cert || !key)) {
    return undefined;
  }

  // In development/production, certificates are required
  if (!cert || !key) {
    throw new Error(
      'Teller client certificate and key are required. ' +
      'Set TELLER_CLIENT_CERT and TELLER_CLIENT_KEY environment variables. ' +
      'These are provided in teller.zip when you create a Teller project.'
    );
  }

  return new Agent({
    connect: {
      cert,
      key,
      rejectUnauthorized: true, // Verify server certificate
    },
  });
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

  // Create HTTPS agent with client certificate for mTLS
  const agent = createTellerHttpsAgent();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
    // @ts-ignore - dispatcher is the correct option for undici Agent
    dispatcher: agent,
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

  // Create HTTPS agent with client certificate for mTLS
  const agent = createTellerHttpsAgent();

  const response = await fetch(`${baseUrl}/accounts/${accountId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
    // @ts-ignore - dispatcher is the correct option for undici Agent
    dispatcher: agent,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Teller API error: ${response.status} ${errorText}`);
  }

  return await response.json() as TellerAccount;
}

/**
 * Fetch enrollment details for an access token
 */
export interface TellerEnrollment {
  id: string;
  status: string;
  institution: {
    id: string;
    name: string;
  };
  links: {
    accounts: string;
  };
}

export async function fetchTellerEnrollment(accessToken: string): Promise<TellerEnrollment | null> {
  const baseUrl = process.env.TELLER_ENV === 'production'
    ? 'https://api.teller.io'
    : 'https://api.teller.io';

  // Create HTTPS agent with client certificate for mTLS
  const agent = createTellerHttpsAgent();

  // Try to get enrollment info from accounts endpoint (first account contains enrollment info)
  try {
    const accountsResponse = await fetch(`${baseUrl}/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
      },
      // @ts-ignore - dispatcher is the correct option for undici Agent
      dispatcher: agent,
    });

    if (accountsResponse.ok) {
      const accounts = await accountsResponse.json() as TellerAccount[];
      if (accounts.length > 0 && accounts[0].institution) {
        // Extract enrollment ID from account links or use institution info
        // Note: Teller API doesn't directly expose enrollment ID in accounts, but we can infer it
        return {
          id: '', // Enrollment ID not directly available from accounts endpoint
          status: 'active',
          institution: accounts[0].institution,
          links: {
            accounts: `${baseUrl}/accounts`,
          },
        };
      }
    }
  } catch (error) {
    console.error('Error fetching enrollment info:', error);
  }

  return null;
}

/**
 * Fetch all accounts for an access token
 */
export async function fetchTellerAccounts(accessToken: string): Promise<TellerAccount[]> {
  const baseUrl = process.env.TELLER_ENV === 'production'
    ? 'https://api.teller.io'
    : 'https://api.teller.io';

  // Create HTTPS agent with client certificate for mTLS
  const agent = createTellerHttpsAgent();

  const response = await fetch(`${baseUrl}/accounts`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
    // @ts-ignore - dispatcher is the correct option for undici Agent
    dispatcher: agent,
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
  targetAccountId?: number | null; // Optional target account ID from mapping
  targetCreditCardId?: number | null; // Optional target credit card ID from mapping
  sourceBatchId?: string; // Optional batch ID to use (if provided, will use it; otherwise will find existing or create new)
}): Promise<{
  fetched: number;
  queued: number;
  errors: string[];
}> {
  const { importSetupId, accessToken, accountId, isHistorical, startDate, endDate, supabase: providedSupabase, budgetAccountId, targetAccountId: providedTargetAccountId, targetCreditCardId: providedTargetCreditCardId, sourceBatchId: providedSourceBatchId } = options;
  const errors: string[] = [];
  
  try {
    // Get supabase client and account_id
    let supabase = providedSupabase;
    let setupAccountId = budgetAccountId;
    let actualIsHistorical = isHistorical;
    let targetAccountId: number | null = providedTargetAccountId ?? null;
    let targetCreditCardId: number | null = providedTargetCreditCardId ?? null;

    // Fetch setup to get account_id, is_historical, and account mappings
    if (!supabase || !setupAccountId) {
      if (!supabase) {
        const { getAuthenticatedUser } = await import('../../supabase-queries');
        const auth = await getAuthenticatedUser();
        supabase = auth.supabase;
      }

      const { data: setup, error: setupError } = await supabase
        .from('automatic_import_setups')
        .select('account_id, is_historical, source_config')
        .eq('id', importSetupId)
        .single();
      
      if (setupError || !setup) {
        throw new Error(`Import setup ${importSetupId} not found`);
      }
      
      setupAccountId = setup.account_id;
      
      // Try to get mapping for this specific Teller account
      const accountMappings = setup.source_config?.account_mappings || [];
      const mapping = accountMappings.find((m: any) => m.teller_account_id === accountId);
      if (mapping) {
        targetAccountId = mapping.target_account_id || null;
        targetCreditCardId = mapping.target_credit_card_id || null;
        // Use per-account is_historical if available, otherwise fall back to provided or global
        if (actualIsHistorical === undefined && mapping.is_historical !== undefined) {
          actualIsHistorical = mapping.is_historical;
        }
      } else {
        // Fallback to global is_historical if no mapping found
        if (actualIsHistorical === undefined) {
          actualIsHistorical = setup.is_historical;
        }
        // Fallback to legacy single target_account_id/target_credit_card_id
        // (for backwards compatibility with old setups)
        const legacySetup = await supabase
          .from('automatic_import_setups')
          .select('target_account_id, target_credit_card_id')
          .eq('id', importSetupId)
          .single();
        
        if (legacySetup.data) {
          targetAccountId = legacySetup.data.target_account_id;
          targetCreditCardId = legacySetup.data.target_credit_card_id;
        }
      }
    } else if (!targetAccountId && !targetCreditCardId) {
      // If supabase and accountId provided, fetch setup for account mappings
      const { data: setup, error: setupError } = await supabase
        .from('automatic_import_setups')
        .select('source_config')
        .eq('id', importSetupId)
        .single();
      
      if (!setupError && setup) {
        const accountMappings = setup.source_config?.account_mappings || [];
        const mapping = accountMappings.find((m: any) => m.teller_account_id === accountId);
        if (mapping) {
          targetAccountId = mapping.target_account_id || null;
          targetCreditCardId = mapping.target_credit_card_id || null;
          // Use per-account is_historical if available
          if (actualIsHistorical === undefined && mapping.is_historical !== undefined) {
            actualIsHistorical = mapping.is_historical;
          }
        }
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

    // Determine batch ID: use provided, find existing pending batch, or create new
    let sourceBatchId = providedSourceBatchId;
    
    if (!sourceBatchId) {
      // Try to find an existing pending batch for this account/import setup
      // This implements the batching window feature - append to existing batch if available
      try {
        const { findExistingPendingBatch } = await import('../queue-manager');
        const existingBatchId = await findExistingPendingBatch({
          importSetupId,
          targetAccountId,
          targetCreditCardId,
          budgetAccountId: setupAccountId,
          supabase,
          sourceType: 'teller',
        });
        
        if (existingBatchId) {
          sourceBatchId = existingBatchId;
        } else {
          // Create new batch ID for this account
          sourceBatchId = `teller-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        }
      } catch (error: any) {
        // If finding existing batch fails, log and create new batch
        console.warn(`Error finding existing pending batch, creating new batch:`, error);
        sourceBatchId = `teller-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }
    }

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
