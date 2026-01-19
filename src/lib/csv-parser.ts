import Papa from 'papaparse';
import type { ParsedTransaction } from './import-types';
import { analyzeCSV, type CSVAnalysisResult } from './column-analyzer';
import { parseDate, normalizeDate } from './date-parser';
import { loadTemplate } from './mapping-templates';
import type { ColumnMapping } from './mapping-templates';
import { extractMerchant, generateTransactionHash } from './csv-parser-helpers';

// Re-export helper functions for backward compatibility
export { extractMerchant, generateTransactionHash };

/**
 * Parse CSV file with intelligent column detection
 * Returns transactions and template info if a template was used
 */
export async function parseCSVFile(
  file: File,
  options?: { skipTemplate?: boolean }
): Promise<{ transactions: ParsedTransaction[]; templateId?: number; fingerprint?: string; dateFormat?: string | null }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: async (results) => {
        try {
          const result = await processCSVData(results.data as string[][], file.name, options?.skipTemplate);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Detect amount sign convention from CSV data
 * Returns 'positive_is_income' if most amounts are negative (checking account style)
 * Returns 'positive_is_expense' if most amounts are positive (credit card style)
 */
function detectAmountSignConvention(
  data: string[][],
  amountColumn: number | null,
  hasHeaders: boolean
): 'positive_is_expense' | 'positive_is_income' {
  if (amountColumn === null) {
    return 'positive_is_expense'; // Default fallback
  }

  const startRow = hasHeaders ? 1 : 0;
  const sampleSize = Math.min(20, data.length - startRow); // Sample up to 20 rows
  let negativeCount = 0;
  let positiveCount = 0;
  let validAmounts = 0;

  for (let i = startRow; i < startRow + sampleSize && i < data.length; i++) {
    const row = data[i];
    if (!row || row.length <= amountColumn) continue;

    const amountStr = row[amountColumn]?.trim();
    if (!amountStr) continue;

    const amount = parseAmount(amountStr);
    if (amount === 0 || isNaN(amount)) continue;

    validAmounts++;
    if (amount < 0) {
      negativeCount++;
    } else {
      positiveCount++;
    }
  }

  // Need at least 3 valid amounts to make a determination
  if (validAmounts < 3) {
    return 'positive_is_expense'; // Default fallback
  }

  // If most amounts are negative, it's likely a checking account (negative = expense)
  // So convention should be positive_is_income (positive = income, negative = expense)
  if (negativeCount > positiveCount * 1.5) {
    return 'positive_is_income';
  }

  // Otherwise default to positive_is_expense (credit card style)
  return 'positive_is_expense';
}

/**
 * Process CSV data with intelligent detection
 */
async function processCSVData(
  data: string[][],
  fileName: string,
  skipTemplate?: boolean
): Promise<{ transactions: ParsedTransaction[]; templateId?: number; fingerprint: string; dateFormat?: string | null }> {
  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Analyze CSV structure
  const analysis = analyzeCSV(data);

  // Check for saved template (unless skipping)
  let mapping: ColumnMapping | null = null;
  let templateId: number | undefined;
  
  if (!skipTemplate) {
    try {
      const template = await loadTemplate(analysis.fingerprint);
      if (template) {
        mapping = template.mapping;
        templateId = template.id;
        // Note: Template usage is now tracked when batches are imported, not during parsing
        // This ensures usage_count reflects actual imports, not just queued batches
      }
    } catch (error) {
      console.warn('Failed to load template:', error);
    }
  }

  // If no template found, use analysis results
  if (!mapping) {
    // Detect amount sign convention from the data
    const detectedConvention = detectAmountSignConvention(
      data,
      analysis.amountColumn,
      analysis.hasHeaders
    );

    mapping = {
      dateColumn: analysis.dateColumn,
      amountColumn: analysis.amountColumn,
      descriptionColumn: analysis.descriptionColumn,
      debitColumn: analysis.debitColumn,
      creditColumn: analysis.creditColumn,
      transactionTypeColumn: null,
      statusColumn: null,
      amountSignConvention: detectedConvention,
      dateFormat: analysis.dateFormat,
      hasHeaders: analysis.hasHeaders,
    };
  }

  // Determine start row (skip headers if present)
  const startRow = mapping.hasHeaders ? 1 : 0;
  const transactions: ParsedTransaction[] = [];

  // Process rows
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    try {
      const transaction = parseRowWithMapping(row, mapping, fileName);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }

  return {
    transactions,
    templateId,
    fingerprint: analysis.fingerprint,
    dateFormat: mapping.dateFormat,
  };
}

/**
 * Determine transaction type from column value or fallback to amount sign
 * Note: The fallback assumes positive_is_expense convention (positive = expense, negative = income)
 * This is a conservative fallback - the actual convention should be determined by detectAmountSignConvention
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
  
  // Fallback: This assumes positive_is_expense convention
  // For checking accounts (where negative = expense), this fallback would be wrong
  // But this function is only used with separate_column convention where the column
  // should contain the type, so this fallback should rarely be hit
  return fallbackAmount >= 0 ? 'expense' : 'income';
}

/**
 * Parse a single row using column mapping
 */
function parseRowWithMapping(
  row: string[],
  mapping: ColumnMapping,
  fileName: string
): ParsedTransaction | null {
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
      console.warn('Both debit and credit columns must be mapped for separate_debit_credit convention');
      return null;
    }

    const debitValue = parseAmount(row[mapping.debitColumn] || '0');
    const creditValue = parseAmount(row[mapping.creditColumn] || '0');

    if (debitValue > 0 && creditValue > 0) {
      console.warn(`Row has both debit and credit values, using debit. Row: ${row.join(',')}`);
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
      return null;
    }
  } else if (convention === 'separate_column') {
    // Use transaction type column
    const transactionTypeValue = mapping.transactionTypeColumn !== null
      ? row[mapping.transactionTypeColumn]?.trim() || null
      : null;

    // Get amount from amountColumn
    if (mapping.amountColumn === null) {
      console.warn('Amount column must be mapped for separate_column convention');
      return null;
    }
    amount = parseAmount(row[mapping.amountColumn]);

    transaction_type = determineTransactionTypeFromColumn(transactionTypeValue, amount);
    amount = Math.abs(amount); // Normalize to positive
  } else {
    // Use amount column with sign convention
    if (mapping.amountColumn !== null) {
      amount = parseAmount(row[mapping.amountColumn]);
      
      if (convention === 'positive_is_expense') {
        transaction_type = amount >= 0 ? 'expense' : 'income';
      } else { // positive_is_income
        transaction_type = amount >= 0 ? 'income' : 'expense';
      }
      amount = Math.abs(amount); // Normalize to positive
    } else if (mapping.debitColumn !== null && mapping.creditColumn !== null) {
      // Fallback to debit/credit columns: debit=expense, credit=income
      const debit = parseAmount(row[mapping.debitColumn] || '0');
      const credit = parseAmount(row[mapping.creditColumn] || '0');
      
      if (debit > 0 && credit > 0) {
        console.warn(`Row has both debit and credit values, using debit. Row: ${row.join(',')}`);
        amount = debit;
        transaction_type = 'expense';
      } else if (debit > 0) {
        amount = debit;
        transaction_type = 'expense';
      } else if (credit > 0) {
        amount = credit;
        transaction_type = 'income';
      } else {
        // Both are zero, skip this row
        return null;
      }
    } else if (mapping.debitColumn !== null) {
      amount = parseAmount(row[mapping.debitColumn]);
      transaction_type = 'expense'; // Debit column = expense
      amount = Math.abs(amount);
    } else if (mapping.creditColumn !== null) {
      amount = parseAmount(row[mapping.creditColumn]);
      transaction_type = 'income'; // Credit column = income
      amount = Math.abs(amount);
    }
  }

  // Validate required fields
  if (!dateValue || !descriptionValue || !amount || isNaN(amount) || amount === 0) {
    return null;
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

  return {
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
  };
}

/**
 * Parse amount string to number
 * Handles various formats: $1,234.56, (123.45), -123.45, 1.234,56 (European)
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

  // Handle European format (comma as decimal separator)
  // Check if it looks like European format (has dots as thousands separators and comma as decimal)
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Legacy format detection (kept for backward compatibility)
 * @deprecated Use intelligent detection instead
 */
export function detectCSVFormat(headers: string[]): string {
  const headerStr = headers.join(',').toLowerCase();

  if (headerStr.includes('cardholder') && headerStr.includes('points')) {
    return 'citi-rewards';
  } else if (headerStr.includes('transaction date') && headerStr.includes('post date')) {
    return 'chase';
  } else if (headerStr.includes('status') && headerStr.includes('debit') && headerStr.includes('credit')) {
    return 'citi-statement';
  } else if (isWellsFargoFormat(headers)) {
    return 'wells-fargo';
  }

  return 'unknown';
}

/**
 * Legacy Wells Fargo format detection
 * @deprecated Use intelligent detection instead
 */
function isWellsFargoFormat(row: string[]): boolean {
  if (row.length < 5) return false;

  const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (!datePattern.test(row[0])) return false;

  const amountStr = row[1].replace(/"/g, '');
  const amountPattern = /^-?\d+\.\d{2}$/;
  if (!amountPattern.test(amountStr)) return false;

  if (row[2] !== '*' && row[2] !== '"*"') return false;

  return true;
}

