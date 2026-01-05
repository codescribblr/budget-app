import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { distance } from 'fastest-levenshtein';

interface TransactionData {
  hash: string;
  date: string;
  description: string;
  amount: number;
}

export async function POST(request: Request) {
  try {
    const { hashes, transactions, batchId } = await request.json() as {
      hashes?: string[];
      transactions?: TransactionData[];
      batchId?: string;
    };

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const duplicateHashes = new Set<string>();

    // Method 1: Check by hash against imported_transactions, but verify transaction exists in transactions table
    // We check imported_transactions for hash lookup, but then verify the transaction actually exists
    // in the transactions table (which is what users see). This prevents false positives from
    // orphaned records in imported_transactions.
    if (hashes && Array.isArray(hashes) && hashes.length > 0 && transactions && Array.isArray(transactions)) {
      // Build a map of hash -> transaction data for quick lookup
      const hashToTransaction = new Map<string, TransactionData>();
      transactions.forEach(txn => {
        hashToTransaction.set(txn.hash, txn);
      });

      // Get hashes from imported_transactions
      // IMPORTANT: Check for records with matching account_id OR NULL account_id
      // (NULL might exist from before migration, though migration should have set them)
      // Also, the unique constraint is (user_id, hash), so same hash can exist with different account_ids
      const { data: importedHashes, error: importedError } = await supabase
        .from('imported_transactions')
        .select('hash, account_id')
        .eq('user_id', user.id)
        .in('hash', hashes)
        .or(`account_id.eq.${accountId},account_id.is.null`);

      if (importedError) throw importedError;

      // For each imported hash, verify the corresponding transaction exists in transactions table
      // Only mark as duplicate if:
      // 1. The hash exists in imported_transactions with matching account_id (or NULL)
      // 2. AND the transaction actually exists in transactions table
      if (importedHashes && importedHashes.length > 0) {
        // Group by hash to avoid duplicate checks
        const uniqueHashes = new Set(importedHashes.map(h => h.hash));
        
        for (const hash of uniqueHashes) {
          const txn = hashToTransaction.get(hash);
          if (txn) {
            const normalizedDate = normalizeDateForComparison(txn.date);
            const normalizedAmount = Math.abs(txn.amount);
            const normalizedDesc = normalizeDescriptionForComparison(txn.description);
            
            // Check if this transaction exists in the transactions table
            // This is the source of truth - if it's not here, it's not a duplicate
            const { data: existingTx, error: txError } = await supabase
              .from('transactions')
              .select('id, description')
              .eq('budget_account_id', accountId)
              .eq('date', normalizedDate)
              .eq('total_amount', normalizedAmount)
              .limit(10); // Get multiple to check description match

            if (!txError && existingTx && existingTx.length > 0) {
              // Check if description matches (fuzzy match)
              const matching = existingTx.some(existingTxn => {
                const existingDesc = normalizeDescriptionForComparison(existingTxn.description);
                const existingLower = existingDesc.toLowerCase();
                const normalizedLower = normalizedDesc.toLowerCase();
                
                // Exact match or substring match
                return existingLower === normalizedLower || 
                       existingLower.includes(normalizedLower) || 
                       normalizedLower.includes(existingLower);
              });

              if (matching) {
                // Transaction exists in transactions table with matching description, so it's a real duplicate
                duplicateHashes.add(hash);
              }
            }
            // If transaction doesn't exist in transactions table, it's NOT a duplicate
            // (might be orphaned data in imported_transactions from a different account or deleted transaction)
          }
        }
      }
    }

    // Method 2: Fallback - Check by date + description + amount
    // This catches duplicates even if hash generation changed (e.g., different originalData)
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      // Get all unique date+description+amount combinations to check
      const checkKeys = new Map<string, TransactionData[]>();
      
      transactions.forEach(txn => {
        const normalizedDate = normalizeDateForComparison(txn.date);
        const normalizedDesc = normalizeDescriptionForComparison(txn.description);
        const normalizedAmount = Math.abs(txn.amount);
        const key = `${normalizedDate}|${normalizedDesc}|${normalizedAmount}`;
        
        if (!checkKeys.has(key)) {
          checkKeys.set(key, []);
        }
        checkKeys.get(key)!.push(txn);
      });

      // Check each unique combination against database
      for (const [key, txns] of checkKeys.entries()) {
        const [date, description, amountStr] = key.split('|');
        const amount = parseFloat(amountStr);

        // Check transactions table directly (what users actually see)
        // Only mark as duplicate if transaction exists in transactions table
        // This prevents false positives from orphaned records in imported_transactions
        const { data: existingTransactions, error: txError } = await supabase
          .from('transactions')
          .select('id, date, description, total_amount')
          .eq('budget_account_id', accountId)
          .eq('date', date)
          .eq('total_amount', amount);

        if (txError) throw txError;

        if (existingTransactions && existingTransactions.length > 0) {
          // Check if description matches using multiple strategies
          const matching = existingTransactions.filter(existingTxn => {
            const existingDesc = normalizeDescriptionForComparison(existingTxn.description);
            const normalizedDesc = normalizeDescriptionForComparison(description);
            
            const existingLower = existingDesc.toLowerCase();
            const normalizedLower = normalizedDesc.toLowerCase();
            
            // Strategy 1: Exact match (case-insensitive)
            if (existingLower === normalizedLower) {
              return true;
            }
            
            // Strategy 2: Substring match - check if one contains the other
            // This catches cases like "UNITED 0162353356601 UNITED.COM" vs "UNITED 0162353356601"
            // Check both directions: longer contains shorter, or shorter contains longer
            const longerDesc = existingLower.length >= normalizedLower.length ? existingLower : normalizedLower;
            const shorterDesc = existingLower.length < normalizedLower.length ? existingLower : normalizedLower;
            
            if (longerDesc.includes(shorterDesc)) {
              // But only if the shorter string is at least 10 characters (to avoid false positives)
              if (shorterDesc.length >= 10) {
                return true;
              }
            }
            
            // Strategy 3: Core merchant/transaction ID match
            // Extract core parts (merchant name + transaction ID) and compare
            const existingCore = extractCoreDescription(existingDesc);
            const normalizedCore = extractCoreDescription(normalizedDesc);
            if (existingCore && normalizedCore && existingCore === normalizedCore) {
              return true;
            }
            
            // Strategy 4: Fuzzy match for descriptions that are very similar
            // Lower threshold to catch more cases (75% instead of 90%)
            const descDistance = distance(existingLower, normalizedLower);
            const maxLength = Math.max(existingDesc.length, normalizedDesc.length);
            if (maxLength > 0 && (1 - descDistance / maxLength) > 0.75) {
              return true;
            }
            
            return false;
          });

          if (matching.length > 0) {
            // Found duplicate(s) by date + description + amount
            txns.forEach(txn => duplicateHashes.add(txn.hash));
          }
        }
      }
    }

    // Mark duplicate_detection task as complete if batchId provided
    if (batchId) {
      try {
        const { markTaskCompleteForBatchServer } = await import('@/lib/processing-tasks-server');
        await markTaskCompleteForBatchServer(batchId, 'duplicate_detection');
      } catch (error) {
        // Log but don't fail - task tracking is not critical
        console.warn('Failed to mark duplicate_detection complete:', error);
      }
    }

    return NextResponse.json({ duplicates: Array.from(duplicateHashes) });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}

/**
 * Normalize date for comparison (YYYY-MM-DD format)
 */
function normalizeDateForComparison(date: string): string {
  const trimmed = date.trim();
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Try to parse and normalize
  try {
    const dateObj = new Date(trimmed);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback
  }
  return trimmed;
}

/**
 * Normalize description for comparison (trim and normalize whitespace)
 */
function normalizeDescriptionForComparison(description: string): string {
  return description.trim().replace(/\s+/g, ' ');
}

/**
 * Extract core description for comparison
 * Removes common suffixes like domain names (.COM, .NET, etc.) and extracts merchant + transaction ID
 * Example: "UNITED 0162353356601 UNITED.COM" -> "united 0162353356601"
 */
function extractCoreDescription(description: string): string | null {
  let normalized = description.trim();
  
  // Remove domain suffixes - handle both " WORD.COM" and "WORD.COM" patterns
  // This catches cases like "UNITED 0162353356601 UNITED.COM"
  normalized = normalized.replace(/\s+[A-Z0-9]+\.(COM|NET|ORG|EDU|GOV|IO|CO|US|UK|CA|AU)\b/gi, '');
  
  // Also remove standalone domain suffixes (in case they appear separately)
  normalized = normalized.replace(/\s+\.(COM|NET|ORG|EDU|GOV|IO|CO|US|UK|CA|AU)\b/gi, '');
  
  // Remove duplicate words/phrases that might result from domain removal
  // Split into words and remove duplicates while preserving order
  const words = normalized.split(/\s+/);
  const seen = new Set<string>();
  const uniqueWords = words.filter(word => {
    const lowerWord = word.toLowerCase();
    if (seen.has(lowerWord)) {
      return false;
    }
    seen.add(lowerWord);
    return true;
  });
  normalized = uniqueWords.join(' ');
  
  // Remove common merchant suffixes that might appear at the end
  const suffixes = [
    /\s+INC\.?$/i,
    /\s+LLC\.?$/i,
    /\s+LTD\.?$/i,
    /\s+CORP\.?$/i,
    /\s+CO\.?$/i,
    /\s+COMPANY$/i,
  ];
  
  suffixes.forEach(suffix => {
    normalized = normalized.replace(suffix, '');
  });
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Return null if empty after normalization
  if (!normalized || normalized.length < 5) {
    return null;
  }
  
  return normalized.toLowerCase();
}

