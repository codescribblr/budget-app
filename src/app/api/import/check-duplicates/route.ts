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
          // Check if description matches (case-insensitive or fuzzy)
          const matching = existing.filter(existingTxn => {
            const existingDesc = normalizeDescriptionForComparison(existingTxn.description);
            const normalizedDesc = normalizeDescriptionForComparison(description);
            
            // Exact match (case-insensitive)
            if (existingDesc.toLowerCase() === normalizedDesc.toLowerCase()) {
              return true;
            }
            
            // Fuzzy match for descriptions that are very similar (e.g., minor whitespace differences)
            const descDistance = distance(existingDesc.toLowerCase(), normalizedDesc.toLowerCase());
            const maxLength = Math.max(existingDesc.length, normalizedDesc.length);
            // If descriptions are > 90% similar, consider it a match
            if (maxLength > 0 && (1 - descDistance / maxLength) > 0.9) {
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
