#!/usr/bin/env node

/**
 * Export SQLite Database to JSON
 * 
 * This script exports your SQLite database to a JSON file that can be imported
 * into your Supabase production account.
 * 
 * Usage:
 *   node scripts/export-sqlite-data.js
 * 
 * Output:
 *   Creates data-export.json with all your categories, accounts, credit cards, etc.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/budget.db');
const OUTPUT_PATH = path.join(__dirname, '../data-export.json');

console.log('📊 Exporting SQLite database to JSON...\n');

try {
  // Open database
  const db = new Database(DB_PATH, { readonly: true });
  
  // Export data
  const exportData = {
    categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
    accounts: db.prepare('SELECT * FROM accounts ORDER BY name').all(),
    credit_cards: db.prepare('SELECT * FROM credit_cards ORDER BY name').all(),
    pending_checks: db.prepare('SELECT * FROM pending_checks ORDER BY created_at').all(),
    settings: db.prepare('SELECT * FROM settings').all(),
  };

  // Try to export merchant_mappings if table exists
  try {
    exportData.merchant_mappings = db.prepare('SELECT * FROM merchant_mappings ORDER BY merchant_pattern').all();
  } catch (e) {
    exportData.merchant_mappings = [];
  }
  
  // Close database
  db.close();
  
  // Write to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(exportData, null, 2));
  
  console.log('✅ Export complete!\n');
  console.log('📁 File created: data-export.json\n');
  console.log('📊 Summary:');
  console.log(`   - Categories: ${exportData.categories.length}`);
  console.log(`   - Accounts: ${exportData.accounts.length}`);
  console.log(`   - Credit Cards: ${exportData.credit_cards.length}`);
  console.log(`   - Pending Checks: ${exportData.pending_checks.length}`);
  console.log(`   - Settings: ${exportData.settings.length}`);
  console.log(`   - Merchant Mappings: ${exportData.merchant_mappings.length}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Review data-export.json');
  console.log('   2. Run: node scripts/import-to-supabase.js');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

