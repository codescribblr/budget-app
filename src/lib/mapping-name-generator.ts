/**
 * Generate human-readable names for automatic CSV mappings
 * Based on CSV structure analysis to identify bank/financial institution styles
 */

import type { CSVAnalysisResult } from './column-analyzer';

/**
 * Generate a mapping name based on CSV structure
 * Returns names like "Wells Fargo Style Data", "Citi Bank Style Data", etc.
 */
export function generateAutomaticMappingName(analysis: CSVAnalysisResult, fileName?: string): string {
  // Try to detect from filename first
  if (fileName) {
    const lowerFileName = fileName.toLowerCase();
    
    // Common bank name patterns in filenames
    const bankPatterns: Array<[RegExp, string]> = [
      [/wells.*fargo|wf/i, 'Wells Fargo'],
      [/chase/i, 'Chase'],
      [/citi|citibank/i, 'Citi Bank'],
      [/bank.*of.*america|boa/i, 'Bank of America'],
      [/us.*bank/i, 'US Bank'],
      [/capital.*one/i, 'Capital One'],
      [/american.*express|amex/i, 'American Express'],
      [/discover/i, 'Discover'],
      [/pnc/i, 'PNC'],
      [/td.*bank/i, 'TD Bank'],
      [/regions/i, 'Regions'],
      [/suntrust/i, 'SunTrust'],
      [/bb&t/i, 'BB&T'],
      [/huntington/i, 'Huntington'],
      [/keybank/i, 'KeyBank'],
      [/m&t/i, 'M&T Bank'],
      [/citizens/i, 'Citizens Bank'],
      [/first.*citizens/i, 'First Citizens'],
      [/truist/i, 'Truist'],
      [/ally/i, 'Ally Bank'],
      [/schwab/i, 'Charles Schwab'],
      [/fidelity/i, 'Fidelity'],
      [/vanguard/i, 'Vanguard'],
      [/morgan.*stanley/i, 'Morgan Stanley'],
      [/goldman.*sachs/i, 'Goldman Sachs'],
    ];

    for (const [pattern, bankName] of bankPatterns) {
      if (pattern.test(lowerFileName)) {
        return `${bankName} Style Data`;
      }
    }
  }

  // Detect based on CSV structure patterns
  const hasHeaders = analysis.hasHeaders;
  const columnCount = analysis.columns.length;
  
  // Check column headers for bank-specific patterns
  if (hasHeaders && analysis.columns.length > 0) {
    const headers = analysis.columns.map(col => col.headerName.toLowerCase());
    const headerText = headers.join(' ');
    
    // Credit card statement patterns
    if (headerText.includes('trans') && headerText.includes('post') && headerText.includes('date')) {
      return 'Credit Card Statement Format';
    }
    
    // Bank statement patterns
    if (headerText.includes('debit') && headerText.includes('credit')) {
      return 'Bank Statement Format (Debit/Credit)';
    }
    
    // Check for specific bank header patterns
    if (headers.some(h => h.includes('wells') || h.includes('fargo'))) {
      return 'Wells Fargo Style Data';
    }
    if (headers.some(h => h.includes('chase'))) {
      return 'Chase Style Data';
    }
    if (headers.some(h => h.includes('citi') || h.includes('citibank'))) {
      return 'Citi Bank Style Data';
    }
    if (headers.some(h => h.includes('bank') && h.includes('america'))) {
      return 'Bank of America Style Data';
    }
  }

  // Detect based on amount sign convention and structure
  if (analysis.debitColumn !== null && analysis.creditColumn !== null) {
    return 'Bank Statement Format (Debit/Credit Columns)';
  }

  // Detect based on date format
  if (analysis.dateFormat) {
    if (analysis.dateFormat.includes('MM/DD')) {
      return 'US Bank Statement Format';
    }
    if (analysis.dateFormat.includes('DD/MM')) {
      return 'International Bank Statement Format';
    }
  }

  // Generic fallback based on column count and structure
  if (columnCount === 3) {
    return 'Simple Transaction Format';
  }
  if (columnCount >= 5) {
    return 'Detailed Bank Statement Format';
  }

  return 'Automatic Mapping';
}
