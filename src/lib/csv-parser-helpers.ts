/**
 * Helper functions for CSV parsing
 * Extracted from csv-parser.ts for better organization
 */

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

