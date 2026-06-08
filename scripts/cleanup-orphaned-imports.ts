/**
 * Cleanup Orphaned Import Records
 * 
 * This script removes records from imported_transactions that don't have
 * corresponding entries in the imported_transaction_links table.
 * 
 * These orphaned records can occur when an import fails partway through,
 * leaving hashes in imported_transactions but no actual transactions created.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', 'database');
const dbPath = path.join(dbDir, 'budget.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  console.error('❌ Database directory not found!');
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🧹 Starting cleanup of orphaned import records...\n');

try {
  // Find orphaned records (in imported_transactions but not in imported_transaction_links)
  const orphanedRecords = db.prepare(`
    SELECT it.id, it.transaction_date, it.description, it.amount
    FROM imported_transactions it
    LEFT JOIN imported_transaction_links itl ON it.id = itl.imported_transaction_id
    WHERE itl.imported_transaction_id IS NULL
  `).all() as Array<{
    id: number;
    transaction_date: string;
    description: string;
    amount: number;
  }>;

  if (orphanedRecords.length === 0) {
    console.log('✅ No orphaned records found. Database is clean!');
    process.exit(0);
  }

  console.log(`📊 Found ${orphanedRecords.length} orphaned record(s):\n`);
  console.log('────────────────────────────────────────────────────────────────');
  orphanedRecords.forEach((record, index) => {
    console.log(`${index + 1}. ID: ${record.id}`);
    console.log(`   Date: ${record.transaction_date}`);
    console.log(`   Description: ${record.description}`);
    console.log(`   Amount: $${record.amount.toFixed(2)}`);
    console.log('');
  });
  console.log('────────────────────────────────────────────────────────────────\n');

  // Delete orphaned records
  const deleteStmt = db.prepare(`
    DELETE FROM imported_transactions
    WHERE id IN (
      SELECT it.id
      FROM imported_transactions it
      LEFT JOIN imported_transaction_links itl ON it.id = itl.imported_transaction_id
      WHERE itl.imported_transaction_id IS NULL
    )
  `);

  const result = deleteStmt.run();
  
  console.log(`✅ Deleted ${result.changes} orphaned record(s)\n`);

  // Show current state
  const totalImported = db.prepare('SELECT COUNT(*) as count FROM imported_transactions').get() as { count: number };
  const totalLinked = db.prepare('SELECT COUNT(*) as count FROM imported_transaction_links').get() as { count: number };

  console.log('📊 Current Database State:');
  console.log(`   Imported Transactions: ${totalImported.count}`);
  console.log(`   Linked Transactions: ${totalLinked.count}`);
  console.log('');

  if (totalImported.count === totalLinked.count) {
    console.log('✅ All imported transactions are properly linked!');
  } else {
    console.log('⚠️  Warning: Mismatch between imported and linked transactions');
  }

  console.log('\n✅ Cleanup completed successfully!');

} catch (error) {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
} finally {
  db.close();
}


