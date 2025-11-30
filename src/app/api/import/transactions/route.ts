import { NextResponse } from 'next/server';
import type { ParsedTransaction } from '@/lib/import-types';
import { learnFromImportedTransactions } from '@/lib/smart-categorizer-supabase';
import { importTransactions } from '@/lib/supabase-queries';

export async function POST(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { transactions, isHistorical, fileName } = await request.json() as {
      transactions: ParsedTransaction[];
      isHistorical?: boolean;
      fileName?: string;
    };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      );
    }

    // Import transactions using Supabase
    const importedCount = await importTransactions(transactions, isHistorical || false, fileName || 'Unknown');

    // Learn from the imported transactions
    // Use description instead of merchant since that's what was used to create merchant groups
    const learningData = transactions
      .filter(txn => txn.splits.length > 0)
      .flatMap(txn =>
        txn.splits.map(split => ({
          merchant: txn.description, // Use description to match the merchant group mapping
          categoryId: split.categoryId,
        }))
      );

    if (learningData.length > 0) {
      await learnFromImportedTransactions(learningData);
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
    });
  } catch (error: any) {
    console.error('Error importing transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
}
