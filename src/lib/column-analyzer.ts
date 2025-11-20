/**
 * Intelligent CSV column analyzer
 * Analyzes CSV structure to detect date, amount, description columns
 * Uses hybrid approach: header matching + content pattern analysis
 */

import { fuzzyMatchHeader, findBestFieldMatch, type FieldType } from './fuzzy-matching';
import { isDateColumn, isAmountColumn, isDescriptionColumn, isBalanceColumn } from './pattern-matchers';
import { detectDateFormat } from './date-parser';

export interface ColumnAnalysis {
  columnIndex: number;
  headerName: string;
  fieldType: 'date' | 'amount' | 'description' | 'debit' | 'credit' | 'balance' | 'unknown';
  confidence: number;
  sampleValues: string[];
  detectionMethod: 'header' | 'content' | 'hybrid';
}

export interface CSVAnalysisResult {
  columns: ColumnAnalysis[];
  hasHeaders: boolean;
  dateColumn: number | null;
  amountColumn: number | null;
  descriptionColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  dateFormat: string | null;
  fingerprint: string;
}

/**
 * Analyze CSV data to detect column types
 */
export function analyzeCSV(data: string[][]): CSVAnalysisResult {
  if (data.length === 0) {
    throw new Error('CSV data is empty');
  }

  const hasHeaders = detectHeaders(data);
  const headers = hasHeaders ? data[0] : data[0].map((_, i) => `Column ${i + 1}`);
  const sampleRows = hasHeaders ? data.slice(1, Math.min(11, data.length)) : data.slice(0, Math.min(10, data.length));

  // Analyze each column
  const columns: ColumnAnalysis[] = headers.map((header, index) => {
    const values = sampleRows
      .map(row => row[index] || '')
      .filter(v => v.trim() !== '');

    return analyzeColumn(header, values, index, hasHeaders);
  });

  // Find best matches for required fields
  const dateColumn = findBestMatch(columns, 'date');
  const amountColumn = findBestMatch(columns, 'amount');
  const descriptionColumn = findBestMatch(columns, 'description');
  const debitColumn = findBestMatch(columns, 'debit');
  const creditColumn = findBestMatch(columns, 'credit');

  // Detect date format
  let dateFormat: string | null = null;
  if (dateColumn !== null) {
    const dateValues = sampleRows
      .map(row => row[dateColumn] || '')
      .filter(v => v.trim() !== '');
    dateFormat = detectDateFormat(dateValues);
  }

  // Generate fingerprint
  const fingerprint = generateFingerprint(headers);

  return {
    columns,
    hasHeaders,
    dateColumn,
    amountColumn,
    descriptionColumn,
    debitColumn,
    creditColumn,
    dateFormat,
    fingerprint,
  };
}

/**
 * Analyze a single column
 */
function analyzeColumn(
  header: string,
  values: string[],
  index: number,
  hasHeaders: boolean
): ColumnAnalysis {
  // Header-based scores (only if headers exist)
  const headerScores = hasHeaders
    ? {
        date: fuzzyMatchHeader(header, 'date'),
        amount: fuzzyMatchHeader(header, 'amount'),
        description: fuzzyMatchHeader(header, 'description'),
        debit: fuzzyMatchHeader(header, 'debit'),
        credit: fuzzyMatchHeader(header, 'credit'),
        balance: fuzzyMatchHeader(header, 'balance'),
      }
    : { date: 0, amount: 0, description: 0, debit: 0, credit: 0, balance: 0 };

  // Content-based scores
  const dateContent = isDateColumn(values);
  const amountContent = isAmountColumn(values);
  const descriptionContent = isDescriptionColumn(values);
  const balanceContent = isBalanceColumn(values);

  // Combine scores (60% header, 40% content)
  // If no headers, rely entirely on content (100%)
  const headerWeight = hasHeaders ? 0.6 : 0;
  const contentWeight = hasHeaders ? 0.4 : 1.0;
  
  // Prefer "amount" over "debit"/"credit" when header doesn't clearly indicate debit/credit
  // Only use debit/credit if header strongly suggests it
  const debitCreditHeaderScore = Math.max(headerScores.debit, headerScores.credit);
  const useDebitCredit = debitCreditHeaderScore > 0.5;
  
  const combinedScores = {
    date: headerScores.date * headerWeight + dateContent.score * contentWeight,
    amount: headerScores.amount * headerWeight + amountContent * contentWeight,
    description: headerScores.description * headerWeight + descriptionContent * contentWeight,
    debit: useDebitCredit && headerScores.debit > headerScores.credit 
      ? headerScores.debit * headerWeight + amountContent * contentWeight 
      : 0,
    credit: useDebitCredit && headerScores.credit > headerScores.debit
      ? headerScores.credit * headerWeight + amountContent * contentWeight
      : 0,
    balance: headerScores.balance * headerWeight + balanceContent * contentWeight,
    unknown: 0,
  };

  // Find best match
  const entries = Object.entries(combinedScores) as [string, number][];
  const [fieldType, confidence] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));

  // Determine detection method
  let detectionMethod: 'header' | 'content' | 'hybrid';
  if (!hasHeaders) {
    detectionMethod = 'content';
  } else if (headerScores[fieldType as keyof typeof headerScores] > 0.5) {
    detectionMethod = confidence > 0.7 ? 'hybrid' : 'header';
  } else {
    detectionMethod = 'content';
  }

  return {
    columnIndex: index,
    headerName: header,
    fieldType: confidence > 0.3 ? (fieldType as ColumnAnalysis['fieldType']) : 'unknown',
    confidence,
    sampleValues: values.slice(0, 3),
    detectionMethod,
  };
}

/**
 * Find the best matching column for a field type
 */
function findBestMatch(columns: ColumnAnalysis[], fieldType: string): number | null {
  const matches = columns.filter(c => c.fieldType === fieldType);
  if (matches.length === 0) return null;

  const best = matches.reduce((a, b) => (a.confidence > b.confidence ? a : b));
  return best.confidence > 0.5 ? best.columnIndex : null;
}

/**
 * Detect if first row contains headers
 */
function detectHeaders(data: string[][]): boolean {
  if (data.length < 2) return true; // Only one row, assume headers

  const firstRow = data[0];
  const secondRow = data[1];

  if (!secondRow) return true;

  // Check if first row has mostly text and second row has numbers/dates
  const firstRowNumeric = firstRow.filter(v => {
    const cleaned = v.trim().replace(/[$,\s()]/g, '');
    return !isNaN(parseFloat(cleaned)) && cleaned !== '';
  }).length;

  const secondRowNumeric = secondRow.filter(v => {
    const cleaned = v.trim().replace(/[$,\s()]/g, '');
    return !isNaN(parseFloat(cleaned)) && cleaned !== '';
  }).length;

  // If second row has significantly more numbers, first row is likely headers
  return secondRowNumeric > firstRowNumeric;
}

/**
 * Generate fingerprint for CSV format
 * Used to match against saved templates
 */
function generateFingerprint(headers: string[]): string {
  const str = headers.join('|').toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${headers.length}-${Math.abs(hash).toString(16)}`;
}

