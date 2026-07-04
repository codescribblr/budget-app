import Papa from 'papaparse';
import type { ParsedTransaction } from './import-types';
import { analyzeCSV, type CSVAnalysisResult, type ColumnAnalysis } from './column-analyzer';
import { loadTemplate } from './mapping-templates';
import type { ColumnMapping } from './mapping-templates';
import { extractMerchant, generateTransactionHash, parseCSVWithMapping, detectStatusColumnIndex } from './csv-parser-helpers';

// Re-export helper functions for backward compatibility
export { extractMerchant, generateTransactionHash };

/**
 * Parse CSV file with intelligent column detection
 * Returns transactions and template info if a template was used
 */
export async function parseCSVFile(
  file: File,
  options?: {
    skipTemplate?: boolean;
    targetAccountId?: number | null;
    targetCreditCardId?: number | null;
  }
): Promise<{ transactions: ParsedTransaction[]; templateId?: number; fingerprint?: string; dateFormat?: string | null }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: async (results) => {
        try {
          const result = await processCSVData(
            results.data as string[][],
            file.name,
            options?.skipTemplate,
            options?.targetAccountId,
            options?.targetCreditCardId
          );
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
 * Detect if a column contains transaction type values (credit/debit/income/expense)
 * Returns the column index if found, null otherwise
 */
function detectTransactionTypeColumn(
  data: string[][],
  columns: ColumnAnalysis[],
  hasHeaders: boolean,
  excludeColumns: Set<number>
): number | null {
  const transactionTypeValues = ['CREDIT', 'DEBIT', 'CR', 'DB', 'INCOME', 'EXPENSE', 'DEPOSIT', 'WITHDRAWAL', '+', '-'];
  const startRow = hasHeaders ? 1 : 0;
  const sampleSize = Math.min(20, data.length - startRow);

  for (const col of columns) {
    if (excludeColumns.has(col.columnIndex)) continue;
    
    // Check header first
    if (hasHeaders && col.headerName) {
      const headerUpper = col.headerName.toUpperCase().trim();
      if (['TYPE', 'TRANSACTION TYPE', 'TXN TYPE', 'TRANS TYPE'].includes(headerUpper)) {
        // Check if values match transaction type patterns
        let matchCount = 0;
        let validValues = 0;
        
        for (let i = startRow; i < startRow + sampleSize && i < data.length; i++) {
          const row = data[i];
          if (!row || row.length <= col.columnIndex) continue;
          
          const value = row[col.columnIndex]?.trim();
          if (!value) continue;
          
          validValues++;
          const valueUpper = value.toUpperCase();
          if (transactionTypeValues.some(pattern => valueUpper.includes(pattern))) {
            matchCount++;
          }
        }
        
        // If at least 70% of values match transaction type patterns, consider it a match
        if (validValues >= 3 && matchCount / validValues >= 0.7) {
          return col.columnIndex;
        }
      }
    }
    
    // Check values even if header doesn't match
    let matchCount = 0;
    let validValues = 0;
    
    for (let i = startRow; i < startRow + sampleSize && i < data.length; i++) {
      const row = data[i];
      if (!row || row.length <= col.columnIndex) continue;
      
      const value = row[col.columnIndex]?.trim();
      if (!value) continue;
      
      validValues++;
      const valueUpper = value.toUpperCase();
      if (transactionTypeValues.some(pattern => valueUpper.includes(pattern))) {
        matchCount++;
      }
    }
    
    // If at least 70% of values match transaction type patterns, consider it a match
    if (validValues >= 3 && matchCount / validValues >= 0.7) {
      return col.columnIndex;
    }
  }
  
  return null;
}

/**
 * Process CSV data with intelligent detection
 */
async function processCSVData(
  data: string[][],
  fileName: string,
  skipTemplate?: boolean,
  targetAccountId?: number | null,
  targetCreditCardId?: number | null
): Promise<{ transactions: ParsedTransaction[]; templateId?: number; fingerprint: string; dateFormat?: string | null }> {
  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Analyze CSV structure
  const analysis = analyzeCSV(data);

  // Check for saved template (unless skipping) - use account-aware lookup
  let mapping: ColumnMapping | null = null;
  let templateId: number | undefined;
  
  if (!skipTemplate) {
    try {
      const template = await loadTemplate(
        analysis.fingerprint,
        targetAccountId,
        targetCreditCardId
      );
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

  // If no template found, use analysis results with improved detection logic
  if (!mapping) {
    // Track mapped columns to avoid duplicates
    const mappedColumns = new Set<number>();
    
    // Case 1: If both debit and credit columns exist, use separate_debit_credit convention
    let detectedConvention: 'positive_is_expense' | 'positive_is_income' | 'separate_column' | 'separate_debit_credit' = 'positive_is_expense';
    let detectedTransactionTypeColumn: number | null = null;
    
    if (analysis.debitColumn !== null && analysis.creditColumn !== null) {
      detectedConvention = 'separate_debit_credit';
      mappedColumns.add(analysis.debitColumn);
      mappedColumns.add(analysis.creditColumn);
      // When using separate debit/credit columns, don't use amountColumn
      // (even if analysis detected one)
    }
    // Case 2: If there's an amount column, check for transaction type column
    else if (analysis.amountColumn !== null) {
      // Check if there's a transaction type column
      const transactionTypeCol = detectTransactionTypeColumn(
        data,
        analysis.columns || [],
        analysis.hasHeaders,
        mappedColumns
      );
      
      if (transactionTypeCol !== null) {
        // Use separate_column convention
        detectedConvention = 'separate_column';
        detectedTransactionTypeColumn = transactionTypeCol;
        mappedColumns.add(analysis.amountColumn);
      } else {
        // Use standard amount column with sign convention detection
        mappedColumns.add(analysis.amountColumn);
        detectedConvention = detectAmountSignConvention(
          data,
          analysis.amountColumn,
          analysis.hasHeaders
        );
      }
    }
    // Case 3: Only debit or credit column exists (shouldn't happen often, but handle it)
    else if (analysis.debitColumn !== null || analysis.creditColumn !== null) {
      // If only one exists, we can't use separate_debit_credit, so fall back to amount detection
      if (analysis.debitColumn !== null) {
        mappedColumns.add(analysis.debitColumn);
      }
      if (analysis.creditColumn !== null) {
        mappedColumns.add(analysis.creditColumn);
      }
      // Note: This case is unusual - typically both debit and credit should exist together
      // Default to positive_is_expense convention
      detectedConvention = 'positive_is_expense';
    }

    mapping = {
      dateColumn: analysis.dateColumn,
      // When using separate_debit_credit, don't use amountColumn
      amountColumn: detectedConvention === 'separate_debit_credit' ? null : analysis.amountColumn,
      descriptionColumn: analysis.descriptionColumn,
      debitColumn: analysis.debitColumn,
      creditColumn: analysis.creditColumn,
      transactionTypeColumn: detectedTransactionTypeColumn,
      statusColumn: detectStatusColumnIndex(data, analysis.hasHeaders, mappedColumns),
      amountSignConvention: detectedConvention,
      dateFormat: analysis.dateFormat,
      hasHeaders: analysis.hasHeaders,
    };
  } else if (mapping.statusColumn === null || mapping.statusColumn === undefined) {
    const excludeColumns = new Set<number>();
    if (mapping.dateColumn !== null) excludeColumns.add(mapping.dateColumn);
    if (mapping.amountColumn !== null) excludeColumns.add(mapping.amountColumn);
    if (mapping.descriptionColumn !== null) excludeColumns.add(mapping.descriptionColumn);
    if (mapping.debitColumn !== null) excludeColumns.add(mapping.debitColumn);
    if (mapping.creditColumn !== null) excludeColumns.add(mapping.creditColumn);
    if (mapping.transactionTypeColumn !== null) excludeColumns.add(mapping.transactionTypeColumn);

    const detectedStatusColumn = detectStatusColumnIndex(
      data,
      mapping.hasHeaders,
      excludeColumns
    );
    if (detectedStatusColumn !== null) {
      mapping = { ...mapping, statusColumn: detectedStatusColumn };
    }
  }

  const transactions = await parseCSVWithMapping(data, mapping, fileName);

  return {
    transactions,
    templateId,
    fingerprint: analysis.fingerprint,
    dateFormat: mapping.dateFormat,
  };
}

/**
 * Parse amount string to number
 * Handles various formats: $1,234.56, (123.45), $(123.45), -123.45, 1.234,56 (European)
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  let cleaned = amountStr.trim();

  // Remove currency symbols and spaces first so " $(3.17)" and "$(4,838.54)" become "(3.17)" / "(4838.54)"
  cleaned = cleaned.replace(/[$,\s]/g, '');

  // Handle negative amounts in parentheses: (123.45) or (1,234.56) after comma removal
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

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

