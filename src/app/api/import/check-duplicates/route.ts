import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const duplicateHashes = new Set<string>();

    // Method 1: Check by hash (primary method)
    // Only check imported_transactions - don't check queued_imports since those haven't been imported yet
    if (hashes && Array.isArray(hashes) && hashes.length > 0) {
      const { data: existingHashes, error } = await supabase
        .from('imported_transactions')
        .select('hash')
        .eq('user_id', user.id)
        .in('hash', hashes);

      if (error) throw error;

      existingHashes?.forEach(row => duplicateHashes.add(row.hash));
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

        // Check imported_transactions only (don't check queued_imports since those haven't been imported yet)
        // Use case-insensitive description matching and fuzzy matching for similar descriptions
        const { data: existing, error } = await supabase
          .from('imported_transactions')
          .select('hash, transaction_date, description, amount')
          .eq('user_id', user.id)
          .eq('transaction_date', date)
          .eq('amount', amount);

        if (!error && existing && existing.length > 0) {
          // Check if description matches using multiple strategies
          const matching = existing.filter(existingTxn => {
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
            if (existingLower.includes(normalizedLower) || normalizedLower.includes(existingLower)) {
              // But only if the shorter string is at least 10 characters (to avoid false positives)
              const shorterLength = Math.min(existingLower.length, normalizedLower.length);
              if (shorterLength >= 10) {
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
 * Example: "UNITED 0162353356601 UNITED.COM" -> "UNITED 0162353356601"
 */
function extractCoreDescription(description: string): string | null {
  let normalized = description.trim();
  
  // Remove common domain suffixes (.COM, .NET, .ORG, etc.) and common suffixes
  normalized = normalized.replace(/\s+\.(COM|NET|ORG|EDU|GOV|IO|CO|US|UK|CA|AU)\b/gi, '');
  
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
