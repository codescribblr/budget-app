#!/usr/bin/env tsx

/**
 * Migration Script: Add Transfer Category
 * 
 * This script:
 * 1. Adds is_system column to categories table
 * 2. Creates the special "Transfer" system category
 * 
 * The Transfer category is used for transactions that should not affect
 * envelope balances or calculations (e.g., transfers between accounts,
 * credit card payments).
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase } from '../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', 'database');
const dbPath = path.join(dbDir, 'budget.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔧 Starting Transfer Category Migration...\n');

try {
  // Initialize database if needed
  console.log('📝 Ensuring database is initialized...');
  initializeDatabase();
  console.log('✅ Database initialized\n');

  // Check if is_system column already exists
  const tableInfo = db.prepare("PRAGMA table_info(categories)").all() as any[];
  const hasIsSystemColumn = tableInfo.some((col: any) => col.name === 'is_system');

  if (!hasIsSystemColumn) {
    console.log('📝 Adding is_system column to categories table...');
    db.exec(`
      ALTER TABLE categories ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT 0
    `);
    console.log('✅ is_system column added successfully\n');
  } else {
    console.log('ℹ️  is_system column already exists\n');
  }

  // Check if Transfer category already exists
  const existingTransfer = db.prepare(`
    SELECT id FROM categories WHERE name = 'Transfer' AND is_system = 1
  `).get();

  if (!existingTransfer) {
    console.log('📝 Creating Transfer system category...');
    
    // Get the highest sort_order to place Transfer at the end
    const maxSortOrder = db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) as max_order FROM categories
    `).get() as { max_order: number };

    db.prepare(`
      INSERT INTO categories (name, monthly_amount, current_balance, sort_order, is_system)
      VALUES ('Transfer', 0, 0, ?, 1)
    `).run(maxSortOrder.max_order + 1);

    console.log('✅ Transfer category created successfully\n');
  } else {
    console.log('ℹ️  Transfer category already exists\n');
  }

  // Display current categories
  console.log('📊 Current Categories:');
  console.log('─'.repeat(80));
  
  const categories = db.prepare(`
    SELECT id, name, is_system, sort_order, current_balance
    FROM categories
    ORDER BY sort_order
  `).all() as any[];

  categories.forEach((cat: any) => {
    const systemBadge = cat.is_system ? '[SYSTEM]' : '';
    console.log(`  ${cat.id}. ${cat.name} ${systemBadge}`);
    console.log(`     Balance: $${cat.current_balance.toFixed(2)}, Sort: ${cat.sort_order}`);
  });

  console.log('─'.repeat(80));
  console.log('\n✅ Migration completed successfully!');
  console.log('\n📝 Notes:');
  console.log('  - The "Transfer" category is now available in all category dropdowns');
  console.log('  - Transactions categorized as "Transfer" will NOT affect envelope balances');
  console.log('  - "Transfer" will NOT appear in the envelope list on the dashboard');
  console.log('  - The auto-categorizer can learn which transactions are transfers');
  console.log('  - "Transfer" category cannot be edited or deleted through the UI');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}


