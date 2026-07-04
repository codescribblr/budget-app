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

interface ExistingTransaction {
  id: number;
  date: string;
  description: string;
  total_amount: number;
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

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    // Fetch all existing transactions in the import date range once (avoids N+1 queries)
    const existingTransactions = await fetchExistingTransactionsInRange(
      supabase,
      accountId,
      transactions
    );
    const dateAmountIndex = buildDateAmountIndex(existingTransactions);

    // Method 1: Check by hash against imported_transactions, verify against pre-fetched transactions
    if (hashes && Array.isArray(hashes) && hashes.length > 0) {
      const hashToTransaction = new Map<string, TransactionData>();
      transactions.forEach(txn => {
        hashToTransaction.set(txn.hash, txn);
      });

      const { data: importedHashes, error: importedError } = await supabase
        .from('imported_transactions')
        .select('hash, account_id')
        .eq('user_id', user.id)
        .in('hash', hashes)
        .or(`account_id.eq.${accountId},account_id.is.null`);

      if (importedError) throw importedError;

      if (importedHashes && importedHashes.length > 0) {
        const uniqueHashes = new Set(importedHashes.map(h => h.hash));

        for (const hash of uniqueHashes) {
          const txn = hashToTransaction.get(hash);
          if (!txn) continue;

          const normalizedDate = normalizeDateForComparison(txn.date);
          const normalizedAmount = Math.abs(txn.amount);
          const normalizedDesc = normalizeDescriptionForComparison(txn.description);
          const candidates = dateAmountIndex.get(`${normalizedDate}|${normalizedAmount}`) || [];

          const matching = candidates.some(existingTxn =>
            descriptionsMatchSimple(existingTxn.description, normalizedDesc)
          );

          if (matching) {
            duplicateHashes.add(hash);
          }
        }
      }
    }

    // Method 2: Fallback - Check by date + description + amount using pre-fetched transactions
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

    for (const [key, txns] of checkKeys.entries()) {
      const [date, description, amountStr] = key.split('|');
      const amount = parseFloat(amountStr);
      const candidates = dateAmountIndex.get(`${date}|${amount}`) || [];

      if (candidates.length === 0) continue;

      const matching = candidates.filter(existingTxn =>
        descriptionsMatchFull(existingTxn.description, description)
      );

      if (matching.length > 0) {
        txns.forEach(txn => duplicateHashes.add(txn.hash));
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

async function fetchExistingTransactionsInRange(
  supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>['supabase'],
  accountId: number,
  transactions: TransactionData[]
): Promise<ExistingTransaction[]> {
  const normalizedDates = transactions.map(t => normalizeDateForComparison(t.date));
  const minDate = normalizedDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = normalizedDates.reduce((a, b) => (a > b ? a : b));

  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, description, total_amount')
    .eq('budget_account_id', accountId)
    .gte('date', minDate)
    .lte('date', maxDate);

  if (error) throw error;
  return data || [];
}

function buildDateAmountIndex(
  existingTransactions: ExistingTransaction[]
): Map<string, ExistingTransaction[]> {
  const index = new Map<string, ExistingTransaction[]>();
  for (const tx of existingTransactions) {
    const key = `${tx.date}|${Math.abs(tx.total_amount)}`;
    const list = index.get(key) || [];
    list.push(tx);
    index.set(key, list);
  }
  return index;
}

function descriptionsMatchSimple(existingDescription: string, normalizedDesc: string): boolean {
  const existingLower = normalizeDescriptionForComparison(existingDescription).toLowerCase();
  const normalizedLower = normalizedDesc.toLowerCase();
  return existingLower === normalizedLower ||
    existingLower.includes(normalizedLower) ||
    normalizedLower.includes(existingLower);
}

function descriptionsMatchFull(existingDescription: string, description: string): boolean {
  const existingDesc = normalizeDescriptionForComparison(existingDescription);
  const normalizedDesc = normalizeDescriptionForComparison(description);
  const existingLower = existingDesc.toLowerCase();
  const normalizedLower = normalizedDesc.toLowerCase();

  if (existingLower === normalizedLower) {
    return true;
  }

  const longerDesc = existingLower.length >= normalizedLower.length ? existingLower : normalizedLower;
  const shorterDesc = existingLower.length < normalizedLower.length ? existingLower : normalizedLower;

  if (longerDesc.includes(shorterDesc) && shorterDesc.length >= 10) {
    return true;
  }

  const existingCore = extractCoreDescription(existingDesc);
  const normalizedCore = extractCoreDescription(normalizedDesc);
  if (existingCore && normalizedCore && existingCore === normalizedCore) {
    return true;
  }

  const descDistance = distance(existingLower, normalizedLower);
  const maxLength = Math.max(existingDesc.length, normalizedDesc.length);
  return maxLength > 0 && (1 - descDistance / maxLength) > 0.75;
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

