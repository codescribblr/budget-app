/**
 * EXAMPLE IMPLEMENTATION: Column Analyzer
 * 
 * This is a reference implementation showing how the intelligent
 * column detection would work. Copy this to src/lib/column-analyzer.ts
 * and customize as needed.
 */

import { distance } from 'fastest-levenshtein';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

const DATE_PATTERNS = [
  { regex: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, format: 'MM/DD/YYYY' },
  { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
  { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY' },
  { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
  { regex: /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/, format: 'MMM DD, YYYY' },
  { regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/, format: 'MM/DD/YY' },
];

const AMOUNT_PATTERN = /^-?\$?\d{1,3}(,?\d{3})*(\.\d{2})?$/;
const AMOUNT_PATTERN_EURO = /^-?\d{1,3}(\.\d{3})*(,\d{2})?$/;
const AMOUNT_PATTERN_PARENS = /^\(\d+\.\d{2}\)$/;

const FIELD_SYNONYMS = {
  date: ['date', 'transaction date', 'trans date', 'post date', 'posting date', 'posted date'],
  amount: ['amount', 'total', 'sum', 'value', 'charge', 'payment', 'transaction amount'],
  description: ['description', 'merchant', 'payee', 'memo', 'details', 'narrative', 'reference'],
  debit: ['debit', 'withdrawal', 'expense', 'charge'],
  credit: ['credit', 'deposit', 'income', 'payment'],
};

// ============================================================================
// MAIN ANALYZER
// ============================================================================

export function analyzeCSV(data: string[][]): CSVAnalysisResult {
  if (data.length === 0) {
    throw new Error('CSV data is empty');
  }

  const hasHeaders = detectHeaders(data);
  const headers = hasHeaders ? data[0] : data[0].map((_, i) => `Column ${i + 1}`);
  const sampleRows = hasHeaders ? data.slice(1, 11) : data.slice(0, 10);
  
  // Analyze each column
  const columns: ColumnAnalysis[] = headers.map((header, index) => {
    const values = sampleRows.map(row => row[index] || '').filter(v => v.trim() !== '');
    
    return analyzeColumn(header, values, index, hasHeaders);
  });

  // Find best matches for required fields
  const dateColumn = findBestMatch(columns, 'date');
  const amountColumn = findBestMatch(columns, 'amount');
  const descriptionColumn = findBestMatch(columns, 'description');
  const debitColumn = findBestMatch(columns, 'debit');
  const creditColumn = findBestMatch(columns, 'credit');

  // Detect date format
  let dateFormat = null;
  if (dateColumn !== null) {
    const dateValues = sampleRows.map(row => row[dateColumn] || '');
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

// ============================================================================
// COLUMN ANALYSIS
// ============================================================================

function analyzeColumn(
  header: string,
  values: string[],
  index: number,
  hasHeaders: boolean
): ColumnAnalysis {
  const headerScores = hasHeaders ? {
    date: fuzzyMatch(header, FIELD_SYNONYMS.date),
    amount: fuzzyMatch(header, FIELD_SYNONYMS.amount),
    description: fuzzyMatch(header, FIELD_SYNONYMS.description),
    debit: fuzzyMatch(header, FIELD_SYNONYMS.debit),
    credit: fuzzyMatch(header, FIELD_SYNONYMS.credit),
  } : { date: 0, amount: 0, description: 0, debit: 0, credit: 0 };

  const contentScores = {
    date: isDateColumn(values),
    amount: isAmountColumn(values),
    description: isDescriptionColumn(values),
  };

  // Combine scores (60% header, 40% content)
  const combinedScores = {
    date: (headerScores.date * 0.6) + (contentScores.date.score * 0.4),
    amount: (headerScores.amount * 0.6) + (contentScores.amount * 0.4),
    description: (headerScores.description * 0.6) + (contentScores.description * 0.4),
    debit: (headerScores.debit * 0.6) + (contentScores.amount * 0.4),
    credit: (headerScores.credit * 0.6) + (contentScores.amount * 0.4),
  };

  // Find best match
  const entries = Object.entries(combinedScores) as [string, number][];
  const [fieldType, confidence] = entries.reduce((a, b) => a[1] > b[1] ? a : b);

  return {
    columnIndex: index,
    headerName: header,
    fieldType: confidence > 0.3 ? fieldType as any : 'unknown',
    confidence,
    sampleValues: values.slice(0, 3),
    detectionMethod: hasHeaders ? 'hybrid' : 'content',
  };
}

// ============================================================================
// PATTERN MATCHERS
// ============================================================================

function isDateColumn(values: string[]): { score: number; format: string | null } {
  if (values.length === 0) return { score: 0, format: null };

  let matches = 0;
  let detectedFormat: string | null = null;

  for (const value of values) {
    for (const { regex, format } of DATE_PATTERNS) {
      if (regex.test(value.trim())) {
        matches++;
        if (!detectedFormat) detectedFormat = format;
        break;
      }
    }
  }

  return {
    score: matches / values.length,
    format: detectedFormat,
  };
}

function isAmountColumn(values: string[]): number {
  if (values.length === 0) return 0;

  const matches = values.filter(v => {
    const trimmed = v.trim();
    return AMOUNT_PATTERN.test(trimmed) ||
           AMOUNT_PATTERN_EURO.test(trimmed) ||
           AMOUNT_PATTERN_PARENS.test(trimmed);
  }).length;

  return matches / values.length;
}

function isDescriptionColumn(values: string[]): number {
  if (values.length === 0) return 0;

  const textValues = values.filter(v => {
    const trimmed = v.trim();
    return trimmed.length > 2 &&
           trimmed.length < 200 &&
           /[a-zA-Z]/.test(trimmed) &&
           !/^\d+$/.test(trimmed);
  }).length;

  return textValues / values.length;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function fuzzyMatch(header: string, synonyms: string[]): number {
  const normalized = header.toLowerCase().trim();
  
  if (synonyms.includes(normalized)) return 1.0;
  if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) return 0.85;
  
  const distances = synonyms.map(s => distance(normalized, s));
  const minDistance = Math.min(...distances);
  
  return Math.max(0, 1 - (minDistance / 5));
}

function detectHeaders(data: string[][]): boolean {
  // Simple heuristic: if first row has mostly text and second row has numbers/dates
  const firstRow = data[0];
  const secondRow = data[1];
  
  if (!secondRow) return true; // Only one row, assume it's headers
  
  const firstRowNumeric = firstRow.filter(v => !isNaN(parseFloat(v))).length;
  const secondRowNumeric = secondRow.filter(v => !isNaN(parseFloat(v))).length;
  
  return secondRowNumeric > firstRowNumeric;
}

function detectDateFormat(values: string[]): string | null {
  for (const value of values) {
    for (const { regex, format } of DATE_PATTERNS) {
      if (regex.test(value.trim())) {
        return format;
      }
    }
  }
  return null;
}

function findBestMatch(columns: ColumnAnalysis[], fieldType: string): number | null {
  const matches = columns.filter(c => c.fieldType === fieldType);
  if (matches.length === 0) return null;
  
  const best = matches.reduce((a, b) => a.confidence > b.confidence ? a : b);
  return best.confidence > 0.5 ? best.columnIndex : null;
}

function generateFingerprint(headers: string[]): string {
  const str = headers.join('|').toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${headers.length}-${Math.abs(hash).toString(16)}`;
}

