/**
 * API to CSV Converter
 * Converts API transaction data (Teller, Plaid, etc.) to virtual CSV format
 * for use with the existing CSV mapping system
 */

export interface ApiTransaction {
  transaction_date: string;
  description: string;
  amount: number;
  original_data: any; // Original API response (TellerTransaction, etc.)
}

/**
 * Convert API transactions to virtual CSV format
 * Creates a CSV structure: Date, Amount (signed), Description
 * This allows API imports to use the same mapping UI as CSV imports
 */
export function convertApiTransactionsToVirtualCSV(
  transactions: ApiTransaction[],
  sourceType: string
): {
  csvData: string[][];
  fingerprint: string;
} {
  if (transactions.length === 0) {
    return {
      csvData: [['Date', 'Amount', 'Description', 'Status']],
      fingerprint: `api-${sourceType}-empty`,
    };
  }

  // Create CSV structure: Date, Amount (signed), Description, Status
  // Include Status column for API imports (Teller has status: 'posted' | 'pending')
  const csvData: string[][] = [
    ['Date', 'Amount', 'Description', 'Status'], // Header row
    ...transactions.map(t => {
      // Extract original signed amount from original_data if available
      // Otherwise use the amount field (which is already absolute)
      let signedAmount: string;
      let status: string = '';
      
      if (t.original_data) {
        // Try to get original signed amount and status from API response
        const originalData = typeof t.original_data === 'string' 
          ? JSON.parse(t.original_data) 
          : t.original_data;
        
        // For Teller: amount field is signed string, status is 'posted' | 'pending'
        if (originalData.amount !== undefined) {
          signedAmount = originalData.amount.toString();
        } else {
          // Fallback: reconstruct signed amount from transaction_type
          // This is less ideal but works if original_data doesn't have amount
          const sign = t.original_data.transaction_type === 'income' ? '+' : '-';
          signedAmount = `${sign}${Math.abs(t.amount)}`;
        }
        
        // Extract status if available (Teller has status field)
        if (originalData.status !== undefined) {
          status = originalData.status.toString();
        }
      } else {
        // Fallback: reconstruct signed amount
        // We can't determine sign without original_data, so default to positive
        signedAmount = t.amount.toString();
      }

      return [
        t.transaction_date,
        signedAmount,
        t.description,
        status, // Status column for filtering pending transactions
      ];
    }),
  ];

  // Generate fingerprint based on source type and structure
  // This allows templates to be matched for the same API source
  const fingerprint = `api-${sourceType}-standard`;

  return { csvData, fingerprint };
}

/**
 * Generate CSV analysis for virtual CSV data
 * Reuses the existing CSV analysis logic
 */
export function analyzeVirtualCSV(csvData: string[][]): {
  fingerprint: string;
  dateColumn: number | null;
  amountColumn: number | null;
  descriptionColumn: number | null;
  hasHeaders: boolean;
  dateFormat: string | null;
} {
  if (csvData.length === 0) {
    return {
      fingerprint: 'empty',
      dateColumn: null,
      amountColumn: null,
      descriptionColumn: null,
      hasHeaders: false,
      dateFormat: null,
    };
  }

  // Virtual CSV always has headers and standard structure
  const hasHeaders = true;
  const dateColumn = 0; // First column
  const amountColumn = 1; // Second column
  const descriptionColumn = 2; // Third column

  // Try to detect date format from first few rows
  let dateFormat: string | null = null;
  const sampleSize = Math.min(5, csvData.length - 1);
  for (let i = 1; i <= sampleSize && i < csvData.length; i++) {
    const dateStr = csvData[i][dateColumn];
    if (dateStr) {
      // Try common date formats
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        dateFormat = 'YYYY-MM-DD';
        break;
      } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        dateFormat = 'MM/DD/YYYY';
        break;
      } else if (dateStr.match(/^\d{2}-\d{2}-\d{4}/)) {
        dateFormat = 'MM-DD-YYYY';
        break;
      }
    }
  }

  // Generate fingerprint based on structure
  const fingerprint = `api-standard-${csvData[0].length}`;

  return {
    fingerprint,
    dateColumn,
    amountColumn,
    descriptionColumn,
    hasHeaders,
    dateFormat,
  };
}


