/**
 * Helper functions for CSV parsing
 * Extracted from csv-parser.ts for better organization
 */

import type { ParsedTransaction } from './import-types';
import type { ColumnMapping } from './mapping-templates';
import { parseDate, normalizeDate } from './date-parser';
import { format } from 'date-fns';
import { parseLocalDate, formatLocalDate } from './date-utils';

/**
 * Extract merchant name from description
 */
export function extractMerchant(description: string): string {
  // Remove common prefixes
  let merchant = description
    .replace(/^(SQ \*|TST\*|PAR\*|AMZN MKTP|AMAZON MKTPL\*)/i, '')
    .replace(/\s+\d{3}-\d{3}-\d{4}.*$/i, '') // Remove phone numbers
    .replace(/\s+[A-Z]{2}$/i, '') // Remove state codes at end
    .replace(/\s+null\s+.*$/i, '') // Remove "null" and everything after
    .trim();
  
  // Take first part before location info
  const parts = merchant.split(/\s{2,}|\s+[A-Z]{2}\s+/);
  merchant = parts[0].trim();
  
  return merchant || description;
}

/**
 * Generate hash for deduplication
 * Includes originalData to distinguish identical transactions that occur separately
 */
/**
 * Generate hash for deduplication
 * Normalizes all inputs to ensure consistent hashing regardless of parsing method
 */
export function generateTransactionHash(
  date: string,
  description: string,
  amount: number,
  originalData?: string
): string {
  // Normalize inputs for consistent hashing:
  // - Date: normalize to YYYY-MM-DD format
  // - Description: trim and normalize whitespace
  // - Amount: use absolute value (consistent with how we store it)
  // - OriginalData: the full CSV row as JSON string (already normalized by JSON.stringify)
  
  // Normalize date to YYYY-MM-DD format
  let normalizedDate = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    // Date is not in YYYY-MM-DD format, try to normalize it
    try {
      const parsed = parseDate(date);
      if (parsed.date) {
        normalizedDate = normalizeDate(parsed.date);
      }
    } catch {
      // If normalization fails, try timezone-safe parsing as fallback
      const dateObj = parseLocalDate(date.trim());
      if (dateObj) {
        normalizedDate = formatLocalDate(dateObj);
      }
      // If all parsing fails, use as-is
    }
  }
  
  // Normalize description (trim and normalize whitespace)
  const normalizedDescription = description.trim().replace(/\s+/g, ' ');
  
  // Use absolute amount for hash (consistent with how we store it)
  // This ensures -250.00 and 250.00 produce the same hash
  const normalizedAmount = Math.abs(amount);
  
  // Include originalData (entire CSV row) to distinguish truly identical transactions
  // This handles cases like two $1.07 McDonald's purchases 2 minutes apart
  const data = originalData
    ? `${normalizedDate}|${normalizedDescription}|${normalizedAmount}|${originalData}`
    : `${normalizedDate}|${normalizedDescription}|${normalizedAmount}`;

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Parse CSV data with explicit column mapping
 */
export async function parseCSVWithMapping(
  data: string[][],
  mapping: ColumnMapping,
  fileName: string
): Promise<ParsedTransaction[]> {
  const startRow = mapping.hasHeaders ? 1 : 0;
  const transactions: ParsedTransaction[] = [];

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    try {
      // Extract values based on mapping
      const dateValue = mapping.dateColumn !== null ? row[mapping.dateColumn] : null;
      const descriptionValue = mapping.descriptionColumn !== null ? row[mapping.descriptionColumn] : null;
      
      let amount = 0;
      let transaction_type: 'income' | 'expense' = 'expense';

      // Handle different amount conventions
      const convention = mapping.amountSignConvention || 'positive_is_expense';

      if (convention === 'separate_debit_credit') {
        // Handle separate debit/credit columns
        if (mapping.debitColumn === null || mapping.creditColumn === null) {
          throw new Error('Both debit and credit columns must be mapped for separate_debit_credit convention');
        }

        const debitValue = parseAmount(row[mapping.debitColumn] || '0');
        const creditValue = parseAmount(row[mapping.creditColumn] || '0');

        if (debitValue > 0 && creditValue > 0) {
          console.warn(`Row ${i} has both debit and credit values, using debit. Row: ${row.join(',')}`);
          amount = debitValue;
          transaction_type = 'expense';
        } else if (debitValue > 0) {
          amount = debitValue;
          transaction_type = 'expense';
        } else if (creditValue > 0) {
          amount = creditValue;
          transaction_type = 'income';
        } else {
          // Both are zero or empty, skip this row
          continue;
        }
      } else if (convention === 'separate_column') {
        // Use transaction type column
        const transactionTypeValue = mapping.transactionTypeColumn !== null
          ? row[mapping.transactionTypeColumn]?.trim() || null
          : null;

        // Get amount from amountColumn
        if (mapping.amountColumn === null) {
          throw new Error('Amount column must be mapped');
        }
        amount = parseAmount(row[mapping.amountColumn]);

        transaction_type = determineTransactionTypeFromColumn(transactionTypeValue, amount);
        amount = Math.abs(amount); // Normalize to positive
      } else {
        // Use amount column with sign convention
        if (mapping.amountColumn === null) {
          throw new Error('Amount column must be mapped');
        }
        amount = parseAmount(row[mapping.amountColumn]);

        if (convention === 'positive_is_expense') {
          transaction_type = amount >= 0 ? 'expense' : 'income';
        } else { // positive_is_income
          transaction_type = amount >= 0 ? 'income' : 'expense';
        }
        amount = Math.abs(amount); // Normalize to positive
      }

      // Validate required fields
      if (!dateValue || !descriptionValue || isNaN(amount) || amount === 0) {
        continue;
      }

      // Parse date
      let dateResult = parseDate(dateValue, mapping.dateFormat || undefined);
      
      // If parsing failed or confidence is very low, try without the detected format
      if (!dateResult.date || dateResult.confidence < 0.5) {
        const retryResult = parseDate(dateValue, undefined);
        if (retryResult.date && retryResult.confidence > dateResult.confidence) {
          dateResult = retryResult; // Use the better result
        }
      }
      
      const date = dateResult.date ? normalizeDate(dateResult.date) : dateValue;

      const description = descriptionValue.trim();
      const merchant = extractMerchant(description);
      const originalData = JSON.stringify(row);
      // Use absolute amount in hash for consistency (we store abs amount)
      const hash = generateTransactionHash(date, description, amount, originalData);

      transactions.push({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        description,
        merchant,
        amount,
        transaction_type,
        originalData,
        hash,
        isDuplicate: false,
        status: 'pending',
        splits: [],
      });
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }

  return transactions;
}

/**
 * Determine transaction type from column value or fallback to amount sign
 */
function determineTransactionTypeFromColumn(
  transactionTypeValue: string | null,
  fallbackAmount: number
): 'income' | 'expense' {
  if (transactionTypeValue) {
    const normalized = transactionTypeValue.toUpperCase().trim();
    if (['INCOME', 'CREDIT', 'CR', 'DEPOSIT', '+'].includes(normalized)) {
      return 'income';
    }
    if (['EXPENSE', 'DEBIT', 'DB', 'WITHDRAWAL', '-'].includes(normalized)) {
      return 'expense';
    }
  }
  
  // Fallback to amount sign if column value unclear
  return fallbackAmount >= 0 ? 'expense' : 'income';
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  let cleaned = amountStr.trim();

  // Handle negative amounts in parentheses: (123.45)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[$,\s]/g, '');

  // Handle European format
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Process transactions: check duplicates and auto-categorize
 */
export async function processTransactions(
  transactions: ParsedTransaction[],
  defaultAccountId?: number | null,
  defaultCreditCardId?: number | null,
  skipAICategorization: boolean = false,
  progressCallback?: (progress: number, stage: string) => void,
  baseUrl?: string // Optional base URL for server-side calls
): Promise<ParsedTransaction[]> {
  // Step 1: Check for duplicates within the file itself
  if (progressCallback) progressCallback(45, 'Checking for duplicate transactions...');
  const seenHashes = new Map<string, number>();
  const withinFileDuplicates = new Set<number>();

  transactions.forEach((txn, index) => {
    if (seenHashes.has(txn.hash)) {
      withinFileDuplicates.add(index);
    } else {
      seenHashes.set(txn.hash, index);
    }
  });

  // Step 2: Fetch existing transaction hashes for deduplication against database
  // Also send transaction data for fallback duplicate detection (by date + description + amount)
  if (progressCallback) progressCallback(50, 'Checking against existing transactions...');
  const checkDuplicatesUrl = baseUrl 
    ? `${baseUrl}/api/import/check-duplicates`
    : '/api/import/check-duplicates';
  const response = await fetch(checkDuplicatesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hashes: transactions.map(t => t.hash),
      transactions: transactions.map(t => ({
        hash: t.hash,
        date: t.date,
        description: t.description,
        amount: t.amount,
      })),
    }),
  });

  const { duplicates } = await response.json();
  const databaseDuplicateSet = new Set(duplicates);

  // Step 3: Fetch categories for auto-categorization
  if (progressCallback) progressCallback(55, 'Loading categories...');
  const categoriesUrl = baseUrl ? `${baseUrl}/api/categories` : '/api/categories';
  const categoriesResponse = await fetch(categoriesUrl);
  const categories = await categoriesResponse.json();

  // Step 4: Get smart category suggestions for all merchants
  if (progressCallback) progressCallback(60, 'Applying categorization rules...');
  const merchants = transactions.map(t => t.merchant);
  const categorizeUrl = baseUrl ? `${baseUrl}/api/categorize` : '/api/categorize';
  const categorizationResponse = await fetch(categorizeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchants }),
  });
  const { suggestions } = await categorizationResponse.json();

  // Step 5: Process each transaction with initial categorization
  if (progressCallback) progressCallback(65, 'Categorizing transactions...');
  const processedTransactions = transactions.map((transaction, index) => {
    const isDatabaseDuplicate = databaseDuplicateSet.has(transaction.hash);
    const isWithinFileDuplicate = withinFileDuplicates.has(index);
    const isDuplicate = isDatabaseDuplicate || isWithinFileDuplicate;

    const duplicateType = isDatabaseDuplicate
      ? 'database' as const
      : isWithinFileDuplicate
      ? 'within-file' as const
      : null;

    const suggestion = suggestions[index];
    const suggestedCategory = suggestion?.categoryId;
    const hasSplits = !!suggestedCategory;

    return {
      ...transaction,
      account_id: transaction.account_id !== undefined ? transaction.account_id : (defaultAccountId || null),
      credit_card_id: transaction.credit_card_id !== undefined ? transaction.credit_card_id : (defaultCreditCardId || null),
      isDuplicate,
      duplicateType,
      status: (isDuplicate || !hasSplits ? 'excluded' : 'pending') as 'pending' | 'confirmed' | 'excluded',
      suggestedCategory,
      splits: suggestedCategory
        ? [{
            categoryId: suggestedCategory,
            categoryName: categories.find((c: any) => c.id === suggestedCategory)?.name || '',
            amount: transaction.amount,
          }]
        : [],
    };
  });

  // Step 6: AI categorization for remaining uncategorized transactions (if enabled)
  if (skipAICategorization) {
    if (progressCallback) progressCallback(100, 'Processing complete!');
    return processedTransactions;
  }

  const uncategorizedTransactions = processedTransactions.filter(
    (txn) => !txn.isDuplicate && (!txn.splits || txn.splits.length === 0)
  );

  if (uncategorizedTransactions.length > 0) {
    try {
      if (progressCallback) progressCallback(70, `Using AI to categorize ${uncategorizedTransactions.length} transaction${uncategorizedTransactions.length !== 1 ? 's' : ''}...`);
      const aiCategorizationResponse = await fetch('/api/import/ai-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: uncategorizedTransactions }),
      });

      if (aiCategorizationResponse.ok || aiCategorizationResponse.status === 503) {
        const responseData = await aiCategorizationResponse.json();
        const { suggestions: aiSuggestions = [], serviceUnavailable, message } = responseData;
        
        // Handle service unavailable (503) - treat as success but with empty suggestions
        if (aiCategorizationResponse.status === 503 || serviceUnavailable) {
          if (typeof window !== 'undefined') {
            const { toast } = await import('sonner');
            toast.info('AI service temporarily unavailable', {
              description: message || 'The AI service is overloaded. Continuing with rule-based categorization only.',
              duration: 5000,
            });
          }
          // Continue without AI categorization
          return processedTransactions;
        }
        
        // Create a map of transaction ID to AI suggestion
        const aiSuggestionMap = new Map<string, { transactionId: string; categoryId: number | null; categoryName: string; confidence: number; reason: string }>(
          aiSuggestions.map((s: any) => [s.transactionId, s])
        );

        const categorizedCount = aiSuggestions.filter((s: any) => s.categoryId).length;
        
        // Show success message if any transactions were categorized
        if (categorizedCount > 0 && typeof window !== 'undefined') {
          const { toast } = await import('sonner');
          toast.success(`AI categorized ${categorizedCount} transaction${categorizedCount !== 1 ? 's' : ''}`, {
            description: `${uncategorizedTransactions.length - categorizedCount} transaction${uncategorizedTransactions.length - categorizedCount !== 1 ? 's' : ''} remain uncategorized`,
          });
        }

        if (progressCallback) progressCallback(90, 'Applying AI category suggestions...');
        // Update transactions with AI suggestions
        return processedTransactions.map((transaction): ParsedTransaction => {
          const aiSuggestion = aiSuggestionMap.get(transaction.id);
          
          if (aiSuggestion && aiSuggestion.categoryId && !transaction.isDuplicate) {
            const category = categories.find((c: any) => c.id === aiSuggestion.categoryId);
            return {
              ...transaction,
              suggestedCategory: aiSuggestion.categoryId,
              status: 'pending' as const,
              splits: [{
                categoryId: aiSuggestion.categoryId,
                categoryName: category?.name || aiSuggestion.categoryName,
                amount: transaction.amount,
                isAICategorized: true, // Mark as AI-categorized
              }],
            };
          }
          
          return {
            ...transaction,
            status: transaction.status as 'pending' | 'confirmed' | 'excluded',
          };
        });
      } else {
        // Handle rate limit and other errors
        const errorData = await aiCategorizationResponse.json().catch(() => ({ error: 'AI categorization failed' }));
        
        if (aiCategorizationResponse.status === 429) {
          // Rate limit exceeded
          if (typeof window !== 'undefined') {
            const { toast } = await import('sonner');
            const resetAt = errorData.resetAt ? new Date(errorData.resetAt) : null;
            const resetTime = resetAt ? resetAt.toLocaleTimeString() : 'tomorrow';
            toast.warning('AI categorization limit reached', {
              description: errorData.message || `Daily limit reached. ${errorData.remaining || 0} attempts remaining. Resets at ${resetTime}.`,
              duration: 6000,
            });
          }
        } else {
          // Other errors - log but don't fail the entire import
          console.warn('AI categorization failed:', errorData.error || 'Unknown error');
          if (typeof window !== 'undefined') {
            const { toast } = await import('sonner');
            toast.info('AI categorization unavailable', {
              description: errorData.message || 'Continuing with rule-based categorization only.',
              duration: 4000,
            });
          }
        }
      }
    } catch (error) {
      // If AI categorization fails, log but don't fail the entire import
      console.warn('Error calling AI categorization:', error);
      if (typeof window !== 'undefined') {
        const { toast } = await import('sonner');
        toast.info('AI categorization unavailable', {
          description: 'Continuing with rule-based categorization only.',
          duration: 4000,
        });
      }
    }
  }

  if (progressCallback) progressCallback(100, 'Processing complete!');
  return processedTransactions;
}
