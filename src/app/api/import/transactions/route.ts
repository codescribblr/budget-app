import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { ParsedTransaction } from '@/lib/import-types';
import { learnFromImportedTransactions } from '@/lib/smart-categorizer';

export async function POST(request: Request) {
  try {
    const { transactions } = await request.json() as { transactions: ParsedTransaction[] };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      );
    }
    const importDate = new Date().toISOString();
    let importedCount = 0;

    // Use a transaction for atomicity
    const insertImported = db.prepare(`
      INSERT INTO imported_transactions (
        import_date, source_file, source_institution, transaction_date,
        description, amount, original_data, hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (date, description, total_amount)
      VALUES (?, ?, ?)
    `);

    const insertSplit = db.prepare(`
      INSERT INTO transaction_splits (transaction_id, category_id, amount)
      VALUES (?, ?, ?)
    `);

    const updateCategoryBalance = db.prepare(`
      UPDATE categories
      SET current_balance = current_balance - ?
      WHERE id = ?
    `);

    const insertLink = db.prepare(`
      INSERT INTO imported_transaction_links (imported_transaction_id, transaction_id)
      VALUES (?, ?)
    `);

    const importAll = db.transaction((txns: ParsedTransaction[]) => {
      for (const txn of txns) {
        // Only import transactions that have splits (are categorized)
        if (txn.splits.length === 0) {
          continue; // Skip uncategorized transactions
        }

        // Calculate total amount from splits
        const totalAmount = txn.splits.reduce((sum, split) => sum + split.amount, 0);

        // Insert into imported_transactions
        const importedResult = insertImported.run(
          importDate,
          'CSV Import',
          'Unknown',
          txn.date,
          txn.description,
          txn.amount,
          txn.originalData,
          txn.hash
        );

        const importedId = importedResult.lastInsertRowid;

        // Create main transaction
        const transactionResult = insertTransaction.run(
          txn.date,
          txn.description,
          totalAmount
        );

        const transactionId = transactionResult.lastInsertRowid;

        // Create splits and update category balances
        for (const split of txn.splits) {
          insertSplit.run(transactionId, split.categoryId, split.amount);
          updateCategoryBalance.run(split.amount, split.categoryId);
        }

        // Link imported transaction to created transaction
        insertLink.run(importedId, transactionId);
        importedCount++;
      }
    });

    importAll(transactions);

    // Learn from the imported transactions
    const learningData = transactions
      .filter(txn => txn.splits.length > 0)
      .flatMap(txn =>
        txn.splits.map(split => ({
          merchant: txn.merchant,
          categoryId: split.categoryId,
        }))
      );

    if (learningData.length > 0) {
      learnFromImportedTransactions(learningData);
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
    });
  } catch (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
}

