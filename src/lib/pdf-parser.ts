/**
 * PDF Parser for Bank Statements
 * Extracts text from PDF and parses it into transaction format
 * Note: This module must only be used server-side (in API routes)
 */
import type { ParsedTransaction } from './import-types';
import { extractMerchant, generateTransactionHash } from './csv-parser-helpers';
import { parseDate, normalizeDate } from './date-parser';

export interface PDFParseResult {
  transactions: ParsedTransaction[];
  success: boolean;
  error?: string;
  rawText?: string;
}

/**
 * Parse PDF file and extract transactions
 */
export async function parsePDFFile(file: File): Promise<PDFParseResult> {
  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import pdf-parse v1 (function-based API, no workers needed)
    // Use require directly - the library has debug code but we can work around it
    let pdfParse: any;
    
    if (typeof require !== 'undefined') {
      // Use require directly (works in Node.js/Next.js API routes)
      // The library's index.js has debug code that runs when module.parent is falsy
      // We'll catch any errors from that and still get the function
      try {
        pdfParse = require('pdf-parse');
      } catch (debugError: any) {
        // If debug code fails (trying to read test file), try to get the function anyway
        // The function should still be exported even if debug code fails
        const pdfParsePath = require.resolve('pdf-parse');
        const pdfParseModule = require.cache[pdfParsePath];
        if (pdfParseModule && pdfParseModule.exports) {
          pdfParse = pdfParseModule.exports;
        } else {
          // If that doesn't work, try importing the lib file directly
          pdfParse = require('pdf-parse/lib/pdf-parse.js');
        }
      }
    } else {
      // Fallback to dynamic import if require is not available
      const pdfParseModule = await import('pdf-parse');
      pdfParse = pdfParseModule.default || pdfParseModule;
    }
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse function not found. Please ensure pdf-parse is installed correctly.');
    }

    // Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return {
        transactions: [],
        success: false,
        error: 'No text found in PDF. The PDF may be image-based or encrypted.',
        rawText: text,
      };
    }

    // Parse transactions from text
    const transactions = parseTransactionsFromText(text, file.name);

    if (transactions.length === 0) {
      return {
        transactions: [],
        success: false,
        error: 'No transactions found in PDF. The format may not be recognized.',
        rawText: text,
      };
    }

    return {
      transactions,
      success: true,
      rawText: text,
    };
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return {
      transactions: [],
      success: false,
      error: error.message || 'Failed to parse PDF',
    };
  }
}

/**
 * Parse transactions from extracted PDF text
 * Handles various bank statement formats with automatic format detection
 */
function parseTransactionsFromText(text: string, fileName: string): ParsedTransaction[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Try format-specific parsers first (they're more accurate)
  // These detect their specific format and return empty if not a match
  
  // 1. Try credit card statement format (Citi, Chase, Amex, etc.)
  const cardTransactions = parseCreditCardStatement(text, lines);
  if (cardTransactions.length > 0) {
    return cardTransactions;
  }
  
  // 2. Try bank statement format (checking/savings accounts)
  const bankTransactions = parseBankStatement(text, lines);
  if (bankTransactions.length > 0) {
    return bankTransactions;
  }

  // Fall back to generic parsing strategies
  let parsedTransactions: ParsedTransaction[] = [];

  // Strategy 1: Look for tabular data (multiple spaces or tabs) - most generic
  parsedTransactions = parseByTableFormat(lines);
  
  if (parsedTransactions.length === 0) {
    // Strategy 2: Look for lines with dates and amounts
    parsedTransactions = parseByDateAndAmount(lines);
  }

  if (parsedTransactions.length === 0) {
    // Strategy 3: Look for common transaction patterns
    parsedTransactions = parseByCommonPatterns(lines);
  }

  return parsedTransactions;
}

/**
 * Parse credit card statement format (generic - works for Citi, Chase, Amex, etc.)
 * Format: Trans. date | Post date | Description | Amount
 * Example: "03/04 03/05 DOLLAR TREE            GREER         SC$5.30"
 * Also handles: "03/11ONLINE PAYMENT, THANK YOU-$2,430.98"
 */
function parseCreditCardStatement(fullText: string, lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Find the transaction section - look for "Standard Purchases" or transaction table headers
  let inTransactionSection = false;
  let transactionStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for transaction section markers
    if (/Standard Purchases|Trans\.\s*date|Post\s*date|Description.*Amount/i.test(line)) {
      inTransactionSection = true;
      transactionStartIndex = i + 1;
      continue;
    }
    
    // Stop at section end markers
    if (inTransactionSection && (
      /Fees charged|Interest charged|Account Summary|Page \d+ of/i.test(line) ||
      /^Total fees|^Total interest|^Interest charge calculation/i.test(line)
    )) {
      break;
    }
    
    if (!inTransactionSection) continue;
    
    // Parse transaction line
    // Format: MM/DD MM/DD MERCHANT NAME LOCATION AMOUNT
    // Or: MM/DD MERCHANT NAME LOCATION AMOUNT (no post date)
    // Or: MM/DDONLINE PAYMENT, THANK YOU-AMOUNT (payment)
    
    // Match date patterns at start: MM/DD or MM/DD MM/DD
    const dateMatch = line.match(/^(\d{1,2}\/\d{1,2})(?:\s+(\d{1,2}\/\d{1,2}))?/);
    if (!dateMatch) continue;
    
    const transDateStr = dateMatch[1];
    const postDateStr = dateMatch[2] || transDateStr;
    
    // Extract amount - look for $XX.XX at the end (may be negative)
    // Handle formats like: 
    //   $5.30 (positive)
    //   -$2,430.98 (negative - minus before dollar)
    //   Description-$2,430.98 (negative - minus before dollar, no space)
    //   ($1.00) (negative - parentheses format)
    
    let amountMatch: RegExpMatchArray | null = null;
    let isNegative = false;
    
    // Try patterns in order of specificity:
    
    // 1. Check for parentheses format first: (123.45) means negative
    amountMatch = line.match(/\(([\d,]+\.\d{2})\)\s*$/);
    if (amountMatch) {
      isNegative = true;
    }
    
    // 2. Match amount pattern at the end - explicitly look for minus sign before dollar amount
    if (!amountMatch) {
      // Match dollar amount at end: $XX.XX (dollar sign is required for this format)
      const dollarAmountMatch = line.match(/(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/);
      
      if (dollarAmountMatch) {
        const matchedAmount = dollarAmountMatch[0].trim();
        const matchIndex = line.lastIndexOf(matchedAmount);
        
        // Check if there's a minus sign immediately before the matched amount
        // This handles: "Description-$2,430.98" or "-$2,430.98"
        if (matchIndex > 0) {
          const charBefore = line[matchIndex - 1];
          if (charBefore === '-') {
            isNegative = true;
          }
        }
        
        // Also check if the match itself starts with minus (shouldn't happen with $, but check anyway)
        if (matchedAmount.startsWith('-')) {
          isNegative = true;
        }
        
        amountMatch = dollarAmountMatch;
      }
    }
    
    if (!amountMatch) continue;
    
    // Extract and clean the amount string
    let amountStr = amountMatch[1].replace(/[\$,\s\(\)]/g, '');
    
    // Apply negative sign if detected
    if (isNegative && !amountStr.startsWith('-')) {
      amountStr = '-' + amountStr;
    }
    
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount === 0) continue;
    
    // Extract description/merchant - everything between dates and amount
    const dateEndIndex = dateMatch[0].length;
    const amountStartIndex = line.lastIndexOf(amountMatch[0]);
    let description = line.substring(dateEndIndex, amountStartIndex).trim();
    
    // Clean up description - remove extra spaces, location codes, etc.
    description = description.replace(/\s+/g, ' ').trim();
    
    // Skip if description is too short or looks like a header
    if (description.length < 3 || /^Trans\.|Post|Description|Amount$/i.test(description)) {
      continue;
    }
    
    // Determine transaction type based on amount sign
    // Negative amounts = credits/payments (income/reduces debt)
    // Positive amounts = purchases/charges (expense/increases debt)
    // For credit cards: negative = income (payment received), positive = expense (charge)
    const transactionType: 'income' | 'expense' = amount < 0 ? 'income' : 'expense';
    
    // Parse dates - assume current year or infer from context
    const currentYear = new Date().getFullYear();
    const transDate = parseCitiDate(transDateStr, currentYear);
    const postDate = parseCitiDate(postDateStr, currentYear);
    
    // Use post date (when transaction posted) as the transaction date
    const date = postDate;
    
    // Extract merchant name (first part of description, before location)
    const merchant = extractMerchant(description);
    
    // Generate hash
    const originalData = JSON.stringify({ line, transDate: transDateStr, postDate: postDateStr, description, amount });
    const hash = generateTransactionHash(date, description, Math.abs(amount), originalData);
    
    transactions.push({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      description: description.trim(),
      merchant,
      amount: Math.abs(amount),
      transaction_type: transactionType,
      originalData,
      hash,
      isDuplicate: false,
      status: 'pending',
      splits: [],
    });
  }
  
  return transactions;
}

/**
 * Parse bank statement date format (MM/DD or MM/DD/YY) to YYYY-MM-DD
 * Infers year from context (assumes current year or previous year if month > current month)
 */
function parseCitiDate(dateStr: string, defaultYear: number): string {
  const parts = dateStr.split('/');
  if (parts.length < 2) return dateStr;
  
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  
  if (isNaN(month) || isNaN(day)) return dateStr;
  
  // Handle YY or YYYY year if provided
  let year = defaultYear;
  if (parts.length === 3) {
    const yearPart = parseInt(parts[2], 10);
    if (!isNaN(yearPart)) {
      if (yearPart < 100) {
        // Two-digit year: assume 2000s if > 50, else 1900s
        year = yearPart > 50 ? 1900 + yearPart : 2000 + yearPart;
      } else {
        year = yearPart;
      }
    }
  } else {
    // No year provided - infer from month
    // If month is greater than current month, assume previous year
    const currentMonth = new Date().getMonth() + 1;
    year = month > currentMonth ? defaultYear - 1 : defaultYear;
  }
  
  // Format as YYYY-MM-DD
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return `${year}-${monthStr}-${dayStr}`;
}

/**
 * Parse bank statement format (checking/savings accounts)
 * Format: Date | Description | Debit | Credit
 * Or: Date | Description | Amount (signed)
 */
function parseBankStatement(fullText: string, lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Find the transaction section
  let inTransactionSection = false;
  let hasDebitCreditColumns = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for transaction section markers
    if (/Transactions?|Activity|Date.*Description|Debit.*Credit/i.test(line)) {
      inTransactionSection = true;
      hasDebitCreditColumns = /Debit.*Credit|Credit.*Debit/i.test(line);
      continue;
    }
    
    // Stop at section end markers
    if (inTransactionSection && (
      /Balance|Summary|Total|Page \d+ of/i.test(line) ||
      /^End of/i.test(line)
    )) {
      break;
    }
    
    if (!inTransactionSection) continue;
    
    // Parse transaction line
    // Format with separate debit/credit: Date Description Debit Credit
    // Format with single amount: Date Description Amount
    
    const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
    if (!dateMatch) continue;
    
    const dateStr = dateMatch[1];
    
    if (hasDebitCreditColumns) {
      // Split by multiple spaces to get columns
      const parts = line.split(/\s{2,}/).filter(p => p.trim().length > 0);
      if (parts.length < 3) continue;
      
      // Last two columns should be debit and credit
      const debitStr = parts[parts.length - 2]?.replace(/[\$,\s]/g, '') || '0';
      const creditStr = parts[parts.length - 1]?.replace(/[\$,\s]/g, '') || '0';
      
      const debit = parseFloat(debitStr);
      const credit = parseFloat(creditStr);
      
      if (isNaN(debit) && isNaN(credit)) continue;
      
      // Use whichever is non-zero
      const amount = debit > 0 ? debit : credit;
      const transactionType: 'income' | 'expense' = credit > 0 ? 'income' : 'expense';
      
      if (amount === 0) continue;
      
      // Description is everything between date and amounts
      const description = parts.slice(1, -2).join(' ').trim();
      
      if (description.length < 3) continue;
      
      const date = parseBankDate(dateStr);
      const merchant = extractMerchant(description);
      const originalData = JSON.stringify({ line, date: dateStr, description, debit, credit });
      const hash = generateTransactionHash(date, description, amount, originalData);
      
      transactions.push({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        description: description.trim(),
        merchant,
        amount,
        transaction_type: transactionType,
        originalData,
        hash,
        isDuplicate: false,
        status: 'pending',
        splits: [],
      });
    } else {
      // Single amount column format
      const amountMatch = line.match(/([-\$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/);
      if (!amountMatch) continue;
      
      const amountStr = amountMatch[1].replace(/[\$,\s\(\)]/g, '');
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount === 0) continue;
      
      const dateEndIndex = dateMatch[0].length;
      const amountStartIndex = line.lastIndexOf(amountMatch[0]);
      const description = line.substring(dateEndIndex, amountStartIndex).trim().replace(/\s+/g, ' ');
      
      if (description.length < 3) continue;
      
      const transactionType: 'income' | 'expense' = amount < 0 ? 'income' : 'expense';
      const date = parseBankDate(dateStr);
      const merchant = extractMerchant(description);
      const originalData = JSON.stringify({ line, date: dateStr, description, amount });
      const hash = generateTransactionHash(date, description, Math.abs(amount), originalData);
      
      transactions.push({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        description: description.trim(),
        merchant,
        amount: Math.abs(amount),
        transaction_type: transactionType,
        originalData,
        hash,
        isDuplicate: false,
        status: 'pending',
        splits: [],
      });
    }
  }
  
  return transactions;
}

/**
 * Parse bank statement date format to YYYY-MM-DD
 */
function parseBankDate(dateStr: string): string {
  // Try to parse using existing date parser first
  const dateResult = parseDate(dateStr);
  if (dateResult.date) {
    return normalizeDate(dateResult.date);
  }
  
  // Fallback: try MM/DD/YYYY or MM/DD/YY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length >= 2) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    
    if (!isNaN(month) && !isNaN(day)) {
      const currentYear = new Date().getFullYear();
      let year = currentYear;
      
      if (parts.length === 3) {
        const yearPart = parseInt(parts[2], 10);
        if (!isNaN(yearPart)) {
          if (yearPart < 100) {
            year = yearPart > 50 ? 1900 + yearPart : 2000 + yearPart;
          } else {
            year = yearPart;
          }
        }
      } else {
        const currentMonth = new Date().getMonth() + 1;
        year = month > currentMonth ? currentYear - 1 : currentYear;
      }
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  
  return dateStr;
}

/**
 * Parse transactions by looking for date and amount patterns
 */
function parseByDateAndAmount(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Date patterns: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  // Amount patterns: $123.45, -123.45, (123.45), 123.45
  const amountPattern = /[\$\(]?(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[\)]?/;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);

    if (dateMatch && amountMatch) {
      const dateStr = dateMatch[1];
      const amountStr = amountMatch[1].replace(/[\(\)\$,\s]/g, '');
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && amount !== 0) {
        // Extract description (everything between date and amount, or after amount)
        let description = line
          .replace(datePattern, '')
          .replace(amountPattern, '')
          .trim();

        // If description is empty, try to get text before/after
        if (!description) {
          const dateIndex = line.indexOf(dateMatch[1]);
          const amountIndex = line.indexOf(amountMatch[1]);
          if (dateIndex < amountIndex) {
            description = line.substring(dateIndex + dateMatch[1].length, amountIndex).trim();
          } else {
            description = line.substring(amountIndex + amountMatch[1].length).trim();
          }
        }

        // Clean up description
        description = description.replace(/\s+/g, ' ').trim();

        if (description.length > 0) {
          const transaction = createTransaction(
            dateStr,
            description,
            Math.abs(amount),
            amount < 0 ? 'income' : 'expense',
            line
          );
          if (transaction) {
            transactions.push(transaction);
          }
        }
      }
    }
  }

  return transactions;
}

/**
 * Parse transactions from table format (multiple spaces or tabs)
 */
function parseByTableFormat(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const line of lines) {
    // Split by multiple spaces or tabs
    const parts = line.split(/\s{2,}|\t/).filter(part => part.trim().length > 0);
    
    if (parts.length >= 3) {
      // Try to identify date, description, and amount columns
      let dateStr = '';
      let description = '';
      let amount = 0;
      let transactionType: 'income' | 'expense' = 'expense';

      // Look for date in first few columns
      for (let i = 0; i < Math.min(3, parts.length); i++) {
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(parts[i])) {
          dateStr = parts[i];
          // Description is likely the next column(s)
          if (i + 1 < parts.length) {
            description = parts.slice(i + 1, -1).join(' ').trim();
          }
          // Amount is likely the last column
          if (parts.length > i + 1) {
            const amountStr = parts[parts.length - 1].replace(/[\$,\s\(\)]/g, '');
            const parsedAmount = parseFloat(amountStr);
            if (!isNaN(parsedAmount)) {
              amount = Math.abs(parsedAmount);
              transactionType = parsedAmount < 0 ? 'income' : 'expense';
            }
          }
          break;
        }
      }

      if (dateStr && description && amount > 0) {
        const transaction = createTransaction(
          dateStr,
          description,
          amount,
          transactionType,
          line
        );
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
  }

  return transactions;
}

/**
 * Parse transactions using common patterns
 */
function parseByCommonPatterns(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Pattern: Look for lines that contain common transaction keywords
  const transactionKeywords = [
    'purchase', 'payment', 'transfer', 'deposit', 'withdrawal',
    'fee', 'charge', 'refund', 'credit', 'debit'
  ];

  for (const line of lines) {
    const hasKeyword = transactionKeywords.some(keyword => 
      line.toLowerCase().includes(keyword)
    );

    if (hasKeyword) {
      // Try to extract date and amount
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      const amountMatch = line.match(/(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);

      if (dateMatch && amountMatch) {
        const dateStr = dateMatch[1];
        const amount = Math.abs(parseFloat(amountMatch[1].replace(/,/g, '')));
        const description = line.trim();

        if (amount > 0) {
          const transaction = createTransaction(
            dateStr,
            description,
            amount,
            'expense',
            line
          );
          if (transaction) {
            transactions.push(transaction);
          }
        }
      }
    }
  }

  return transactions;
}

/**
 * Create a ParsedTransaction from parsed data
 */
function createTransaction(
  dateStr: string,
  description: string,
  amount: number,
  transactionType: 'income' | 'expense',
  originalLine: string
): ParsedTransaction | null {
  try {
    // Parse date
    const dateResult = parseDate(dateStr);
    const date = dateResult.date ? normalizeDate(dateResult.date) : dateStr;

    // Extract merchant
    const merchant = extractMerchant(description);

    // Generate hash
    const originalData = JSON.stringify({ line: originalLine, date: dateStr, description, amount });
    const hash = generateTransactionHash(date, description, amount, originalData);

    return {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      description: description.trim(),
      merchant,
      amount: Math.abs(amount),
      transaction_type: transactionType,
      originalData,
      hash,
      isDuplicate: false,
      status: 'pending',
      splits: [],
    };
  } catch (error) {
    console.warn('Error creating transaction:', error);
    return null;
  }
}

