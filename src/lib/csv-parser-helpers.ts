/**
 * Helper functions for CSV parsing
 * Extracted from csv-parser.ts for better organization
 */

import type { ParsedTransaction } from './import-types';
import type { ColumnMapping } from './mapping-templates';
import { parseDate, normalizeDate } from './date-parser';

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
export function generateTransactionHash(
  date: string,
  description: string,
  amount: number,
  originalData?: string
): string {
  // Include originalData (entire CSV row) to distinguish truly identical transactions
  // This handles cases like two $1.07 McDonald's purchases 2 minutes apart
  const data = originalData
    ? `${date}|${description}|${amount}|${originalData}`
    : `${date}|${description}|${amount}`;

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

      // Handle amount extraction
      if (mapping.amountColumn !== null) {
        amount = parseAmount(row[mapping.amountColumn]);
      } else if (mapping.debitColumn !== null && mapping.creditColumn !== null) {
        const debit = parseAmount(row[mapping.debitColumn] || '0');
        const credit = parseAmount(row[mapping.creditColumn] || '0');
        amount = debit || credit;
      } else if (mapping.debitColumn !== null) {
        amount = parseAmount(row[mapping.debitColumn]);
      } else if (mapping.creditColumn !== null) {
        amount = parseAmount(row[mapping.creditColumn]);
      }

      // Validate required fields
      if (!dateValue || !descriptionValue || !amount || isNaN(amount)) {
        continue;
      }

      // Parse date
      const dateResult = parseDate(dateValue, mapping.dateFormat || undefined);
      const date = dateResult.date ? normalizeDate(dateResult.date) : dateValue;

      const description = descriptionValue.trim();
      const merchant = extractMerchant(description);
      const originalData = JSON.stringify(row);
      const hash = generateTransactionHash(date, description, amount, originalData);

      transactions.push({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        description,
        merchant,
        amount: Math.abs(amount),
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
export async function processTransactions(transactions: ParsedTransaction[]): Promise<ParsedTransaction[]> {
  // Step 1: Check for duplicates within the file itself
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
  const response = await fetch('/api/import/check-duplicates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hashes: transactions.map(t => t.hash),
    }),
  });

  const { duplicates } = await response.json();
  const databaseDuplicateSet = new Set(duplicates);

  // Step 3: Fetch categories for auto-categorization
  const categoriesResponse = await fetch('/api/categories');
  const categories = await categoriesResponse.json();

  // Step 4: Get smart category suggestions for all merchants
  const merchants = transactions.map(t => t.merchant);
  const categorizationResponse = await fetch('/api/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchants }),
  });
  const { suggestions } = await categorizationResponse.json();

  // Step 5: Process each transaction
  return transactions.map((transaction, index) => {
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
      isDuplicate,
      duplicateType,
      status: isDuplicate || !hasSplits ? 'excluded' : 'pending',
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
}
