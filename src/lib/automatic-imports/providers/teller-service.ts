/**
 * Teller Integration Service
 * Handles fetching transactions from Teller API and queuing them
 */

import { Agent } from 'undici';
import { queueTransactions } from '../queue-manager';
import type { ParsedTransaction } from '../../import-types';
import { generateTransactionHash } from '../../csv-parser';
import { extractMerchant } from '../../csv-parser-helpers';
import type { ColumnMapping } from '../../mapping-templates';
import { convertApiTransactionsToVirtualCSV, analyzeVirtualCSV } from '../api-to-csv-converter';
import { analyzeCSV } from '../../column-analyzer';

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
 * @param mapping Optional ColumnMapping template - if provided, uses amountSignConvention from template
 */
export function convertTellerTransactionToParsed(
  tellerTransaction: TellerTransaction,
  accountId?: number,
  creditCardId?: number,
  mapping?: ColumnMapping
): ParsedTransaction {
  const parsedAmount = parseFloat(tellerTransaction.amount);
  if (isNaN(parsedAmount)) {
    throw new Error(`Invalid transaction amount: ${tellerTransaction.amount}`);
  }
  const amount = Math.abs(parsedAmount);
  
  // Use mapping template if provided, otherwise default to positive_is_expense
  const amountSignConvention = mapping?.amountSignConvention || 'positive_is_expense';
  const isIncome = amountSignConvention === 'positive_is_income'
    ? parsedAmount > 0
    : parsedAmount < 0; // positive_is_expense: negative amounts are income
  
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
    let mappingToUse: ColumnMapping | undefined;

    // Fetch setup to get account_id, is_historical, and account mappings
    if (!supabase || !setupAccountId) {
      if (!supabase) {
        const { getAuthenticatedUser } = await import('../../supabase-queries');
        const auth = await getAuthenticatedUser();
        supabase = auth.supabase;
      }

      const { data: setup, error: setupError } = await supabase
        .from('automatic_import_setups')
        .select('account_id, is_historical, source_config, csv_mapping_template_id')
        .eq('id', importSetupId)
        .single();
      
      if (setupError || !setup) {
        throw new Error(`Import setup ${importSetupId} not found`);
      }
      
      setupAccountId = setup.account_id;
      
      // Load template mapping if available
      let templateMapping: ColumnMapping | undefined;
      if (setup.csv_mapping_template_id) {
        const { loadTemplateById } = await import('../../mapping-templates');
        const template = await loadTemplateById(setup.csv_mapping_template_id, supabase);
        if (template) {
          templateMapping = template.mapping;
        }
      }
      
      // Try to get mapping for this specific Teller account
      const accountMappings = setup.source_config?.account_mappings || [];
      const accountMapping = accountMappings.find((m: any) => m.teller_account_id === accountId);
      
      // Check for per-account template first, then fall back to global template
      let accountTemplateMapping: ColumnMapping | undefined;
      if (accountMapping?.csv_mapping_template_id) {
        const { loadTemplateById } = await import('../../mapping-templates');
        const accountTemplate = await loadTemplateById(accountMapping.csv_mapping_template_id, supabase);
        if (accountTemplate) {
          accountTemplateMapping = accountTemplate.mapping;
        }
      }
      
      // Use per-account template if available, otherwise use global template
      mappingToUse = accountTemplateMapping || templateMapping;
      
      if (accountMapping) {
        targetAccountId = accountMapping.target_account_id || null;
        targetCreditCardId = accountMapping.target_credit_card_id || null;
        // Use per-account is_historical if available, otherwise fall back to provided or global
        if (actualIsHistorical === undefined && accountMapping.is_historical !== undefined) {
          actualIsHistorical = accountMapping.is_historical;
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
      // If supabase and accountId provided, fetch setup for account mappings and mapping template
      const { data: setup, error: setupError } = await supabase
        .from('automatic_import_setups')
        .select('source_config, csv_mapping_template_id')
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
        
        // Load mapping template if not already loaded
        if (!mappingToUse) {
          // Check for per-account template first, then fall back to global template
          let templateId = mapping?.csv_mapping_template_id || setup.csv_mapping_template_id;
          if (templateId) {
            const { loadTemplateById } = await import('../../mapping-templates');
            const template = await loadTemplateById(templateId, supabase);
            if (template) {
              mappingToUse = template.mapping;
            }
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

    // CRITICAL: Ensure mapping template is always loaded before converting transactions
    // This ensures field mappings (especially amountSignConvention) are correctly applied
    if (!mappingToUse && supabase) {
      const { data: setup } = await supabase
        .from('automatic_import_setups')
        .select('csv_mapping_template_id, source_config')
        .eq('id', importSetupId)
        .single();
      
      if (setup) {
        // Check for per-account template first, then fall back to global template
        const accountMappings = setup.source_config?.account_mappings || [];
        const accountMapping = accountMappings.find((m: any) => m.teller_account_id === accountId);
        
        let templateId = accountMapping?.csv_mapping_template_id || setup.csv_mapping_template_id;
        if (templateId) {
          const { loadTemplateById } = await import('../../mapping-templates');
          const template = await loadTemplateById(templateId, supabase);
          if (template) {
            mappingToUse = template.mapping;
          }
        }
      }
    }
    
    // Log warning if no mapping template found (transactions will use default convention)
    if (!mappingToUse) {
      console.warn(`No mapping template found for import setup ${importSetupId}, account ${accountId}. Using default amountSignConvention: positive_is_expense`);
    }

    // Convert to ParsedTransaction format with account mapping and template
    // Filter out pending transactions - they will be sent again when they clear
    const parsedTransactions = transactions
      .filter(txn => {
        // Skip pending transactions - they'll be sent again when cleared
        // Only include transactions with status 'posted' (cleared/completed)
        if (txn.status === 'pending') {
          console.log(`Skipping pending Teller transaction: ${txn.id} - ${txn.description}`);
          return false;
        }
        return true;
      })
      .map(txn => 
        convertTellerTransactionToParsed(
          txn, 
          targetAccountId || undefined, 
          targetCreditCardId || undefined,
          mappingToUse
        )
      );

    // Create virtual CSV data for remapping support (API imports)
    // This allows API imports to use the same remapping UI as CSV imports
    const virtualCSV = convertApiTransactionsToVirtualCSV(
      parsedTransactions.map(txn => ({
        transaction_date: txn.date,
        description: txn.description,
        amount: txn.amount,
        original_data: txn.originalData ? JSON.parse(txn.originalData) : null,
      })),
      'teller'
    );
    
    // Analyze virtual CSV structure
    const csvAnalysis = analyzeCSV(virtualCSV.csvData);
    
    // Get template info for CSV metadata
    let csvMappingTemplateId: number | undefined;
    let csvMappingName: string | undefined;
    if (mappingToUse) {
      // Try to find template ID from setup
      const { data: setup } = await supabase
        .from('automatic_import_setups')
        .select('csv_mapping_template_id, source_config')
        .eq('id', importSetupId)
        .single();
      
      if (setup) {
        const accountMappings = setup.source_config?.account_mappings || [];
        const accountMapping = accountMappings.find((m: any) => m.teller_account_id === accountId);
        csvMappingTemplateId = accountMapping?.csv_mapping_template_id || setup.csv_mapping_template_id || undefined;
        
        if (csvMappingTemplateId) {
          // Get template name
          const { data: template } = await supabase
            .from('csv_import_templates')
            .select('template_name')
            .eq('id', csvMappingTemplateId)
            .single();
          
          csvMappingName = template?.template_name || 'Teller Import Template';
        }
      }
    }

    // Determine batch ID: use provided, find existing pending batch, or create deterministic batch ID
    // CRITICAL: Batch ID must be deterministic based on import_setup_id + teller_account_id
    // to prevent creating multiple queues for the same import setup
    let sourceBatchId = providedSourceBatchId;
    
    if (!sourceBatchId) {
      // First, try to find an existing pending batch for this account/import setup
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
          // Create deterministic batch ID based on import_setup_id + teller_account_id
          // This ensures the same setup+account always uses the same batch ID
          // Format: teller-{importSetupId}-{tellerAccountId}
          // This prevents race conditions where multiple webhooks create separate batches
          const accountIdentifier = targetAccountId 
            ? `acc-${targetAccountId}` 
            : targetCreditCardId 
              ? `cc-${targetCreditCardId}` 
              : `teller-${accountId}`;
          sourceBatchId = `teller-${importSetupId}-${accountIdentifier}`;
        }
      } catch (error: any) {
        // If finding existing batch fails, still use deterministic batch ID
        console.warn(`Error finding existing pending batch, using deterministic batch ID:`, error);
        const accountIdentifier = targetAccountId 
          ? `acc-${targetAccountId}` 
          : targetCreditCardId 
            ? `cc-${targetCreditCardId}` 
            : `teller-${accountId}`;
        sourceBatchId = `teller-${importSetupId}-${accountIdentifier}`;
      }
    }

    // Queue transactions with virtual CSV data for remapping support
    const queued = await queueTransactions({
      importSetupId,
      transactions: parsedTransactions,
      sourceBatchId,
      isHistorical: actualIsHistorical || false,
      accountId: setupAccountId,
      supabase,
      // Virtual CSV data for API imports (enables remapping)
      csvData: virtualCSV.csvData,
      csvAnalysis: csvAnalysis,
      csvFingerprint: virtualCSV.fingerprint,
      csvMappingTemplateId: csvMappingTemplateId,
      csvFileName: `Teller Account Transactions`,
      csvMappingName: csvMappingName,
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

