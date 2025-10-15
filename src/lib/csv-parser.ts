import Papa from 'papaparse';
import type { ParsedTransaction } from './import-types';

// Detect CSV format based on headers
export function detectCSVFormat(headers: string[]): string {
  const headerStr = headers.join(',').toLowerCase();
  
  if (headerStr.includes('cardholder') && headerStr.includes('points')) {
    return 'citi-rewards';
  } else if (headerStr.includes('transaction date') && headerStr.includes('post date')) {
    return 'chase';
  } else if (headerStr.includes('status') && headerStr.includes('debit') && headerStr.includes('credit')) {
    return 'citi-statement';
  } else if (!headers[0] && headers.length >= 5) {
    // Wells Fargo format has no headers
    return 'wells-fargo';
  }
  
  return 'unknown';
}

// Extract merchant name from description
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

// Generate hash for deduplication (simple hash for browser)
export function generateTransactionHash(date: string, description: string, amount: number): string {
  const data = `${date}|${description}|${amount}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Parse CSV file
export async function parseCSVFile(file: File): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const transactions = processCSVData(results.data as string[][], file.name);
          resolve(transactions);
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

function processCSVData(data: string[][], fileName: string): ParsedTransaction[] {
  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = data[0];
  const format = detectCSVFormat(headers);
  const transactions: ParsedTransaction[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    if (!row || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    try {
      const transaction = parseRow(row, headers, format, fileName);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }

  return transactions;
}

function parseRow(
  row: string[],
  headers: string[],
  format: string,
  fileName: string
): ParsedTransaction | null {
  let date = '';
  let description = '';
  let amount = 0;

  switch (format) {
    case 'citi-rewards':
      // Date,Time,Cardholder,Amount,Points,Balance,Status,Type,Merchant,Description
      date = row[0];
      description = row[9] || row[8] || 'Unknown';
      amount = parseFloat(row[3]);
      break;

    case 'chase':
      // Transaction Date,Post Date,Description,Category,Type,Amount,Memo
      date = row[0];
      description = row[2];
      amount = Math.abs(parseFloat(row[5]));
      // Chase uses negative for purchases
      if (row[4] !== 'Payment') {
        amount = Math.abs(amount);
      }
      break;

    case 'wells-fargo':
      // "10/10/2025","-250.00","*","","Description"
      date = row[0].replace(/"/g, '');
      description = row[4].replace(/"/g, '');
      amount = Math.abs(parseFloat(row[1].replace(/"/g, '')));
      break;

    case 'citi-statement':
      // Status,Date,Description,Debit,Credit
      date = row[1];
      description = row[2];
      const debit = row[3] ? parseFloat(row[3]) : 0;
      const credit = row[4] ? parseFloat(row[4]) : 0;
      amount = debit || credit;
      break;

    default:
      // Try to auto-detect
      date = row[0];
      description = row[1] || row[2] || 'Unknown';
      amount = Math.abs(parseFloat(row[row.length - 1]));
      break;
  }

  // Skip if we couldn't parse essential data
  if (!date || !amount || isNaN(amount)) {
    return null;
  }

  const merchant = extractMerchant(description);
  const hash = generateTransactionHash(date, description, amount);

  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: normalizeDate(date),
    description,
    merchant,
    amount,
    originalData: JSON.stringify(row),
    hash,
    isDuplicate: false,
    status: 'pending',
    splits: [],
  };
}

function normalizeDate(dateStr: string): string {
  // Try to parse various date formats and return YYYY-MM-DD
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return as-is if can't parse
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

