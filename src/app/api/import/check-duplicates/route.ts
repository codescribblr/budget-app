import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import {
  descriptionsMatchForDuplicate,
  getMerchantNameFromTransactionRow,
  getOriginalImportTextsFromLinks,
  normalizeAmountKey,
  normalizeComparableDescription,
  parseDateAmountDescriptionKey,
} from '@/lib/duplicate-matching';

interface TransactionData {
  hash: string;
  date: string;
  description: string;
  amount: number;
  merchant?: string | null;
  originalData?: unknown;
}

interface ExistingTransaction {
  id: number;
  date: string;
  description: string;
  total_amount: number;
  merchantName: string | null;
  originalImportTexts: string[];
}

function normalizeDateForComparison(date: string): string {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

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

    const existingTransactions = await fetchExistingTransactionsInRange(
      supabase,
      accountId,
      transactions
    );
    const dateAmountIndex = buildDateAmountIndex(existingTransactions);

    if (hashes && Array.isArray(hashes) && hashes.length > 0) {
      const hashToTransaction = new Map<string, TransactionData>();
      transactions.forEach((txn) => {
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
        const uniqueHashes = new Set(importedHashes.map((h) => h.hash));

        for (const hash of uniqueHashes) {
          const txn = hashToTransaction.get(hash);
          if (!txn) continue;

          const normalizedDate = normalizeDateForComparison(txn.date);
          const normalizedAmount = normalizeAmountKey(txn.amount);
          const candidates = dateAmountIndex.get(`${normalizedDate}|${normalizedAmount}`) || [];

          const matching = candidates.some((existingTxn) =>
            descriptionsMatchForDuplicate(
              {
                description: existingTxn.description,
                merchantName: existingTxn.merchantName,
                originalImportTexts: existingTxn.originalImportTexts,
              },
              {
                description: txn.description,
                merchant: txn.merchant,
                originalData: txn.originalData,
              }
            )
          );

          if (matching) {
            duplicateHashes.add(hash);
          }
        }
      }
    }

    const checkKeys = new Map<string, TransactionData[]>();

    transactions.forEach((txn) => {
      const normalizedDate = normalizeDateForComparison(txn.date);
      const normalizedDesc = normalizeComparableDescription(txn.description);
      const normalizedAmount = normalizeAmountKey(txn.amount);
      const key = `${normalizedDate}|${normalizedDesc}|${normalizedAmount}`;

      if (!checkKeys.has(key)) {
        checkKeys.set(key, []);
      }
      checkKeys.get(key)!.push(txn);
    });

    for (const [key, txns] of checkKeys.entries()) {
      const { date, description, amount } = parseDateAmountDescriptionKey(key);
      const amountKey = normalizeAmountKey(amount);
      const candidates = dateAmountIndex.get(`${date}|${amountKey}`) || [];

      if (candidates.length === 0) continue;

      const matching = candidates.filter((existingTxn) =>
        descriptionsMatchForDuplicate(
          {
            description: existingTxn.description,
            merchantName: existingTxn.merchantName,
            originalImportTexts: existingTxn.originalImportTexts,
          },
          {
            description,
            merchant: txns[0]?.merchant,
            originalData: txns[0]?.originalData,
          }
        )
      );

      if (matching.length > 0) {
        txns.forEach((txn) => duplicateHashes.add(txn.hash));
      }
    }

    if (batchId) {
      try {
        const { markTaskCompleteForBatchServer } = await import('@/lib/processing-tasks-server');
        await markTaskCompleteForBatchServer(batchId, 'duplicate_detection');
      } catch (error) {
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
  const normalizedDates = transactions.map((t) => normalizeDateForComparison(t.date));
  const minDate = normalizedDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = normalizedDates.reduce((a, b) => (a > b ? a : b));

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      date,
      description,
      total_amount,
      merchant_groups (
        display_name,
        global_merchants (
          display_name
        )
      ),
      merchant_override:global_merchants!merchant_override_id (
        display_name
      ),
      imported_transaction_links (
        imported_transactions (
          description,
          merchant,
          metadata
        )
      )
    `)
    .eq('budget_account_id', accountId)
    .gte('date', minDate)
    .lte('date', maxDate);

  if (error) throw error;

  return (data || []).map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    total_amount: transaction.total_amount,
    merchantName: getMerchantNameFromTransactionRow(transaction),
    originalImportTexts: getOriginalImportTextsFromLinks(transaction.imported_transaction_links),
  }));
}

function buildDateAmountIndex(
  existingTransactions: ExistingTransaction[]
): Map<string, ExistingTransaction[]> {
  const index = new Map<string, ExistingTransaction[]>();
  for (const tx of existingTransactions) {
    const key = `${tx.date}|${normalizeAmountKey(tx.total_amount)}`;
    const list = index.get(key) || [];
    list.push(tx);
    index.set(key, list);
  }
  return index;
}
