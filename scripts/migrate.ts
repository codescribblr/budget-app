import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'budget.db');
const db = new Database(dbPath);

console.log('Running database migrations...');

// Add include_in_totals to accounts table
try {
  db.exec(`
    ALTER TABLE accounts ADD COLUMN include_in_totals INTEGER NOT NULL DEFAULT 1
  `);
  console.log('✓ Added include_in_totals to accounts table');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('- include_in_totals already exists in accounts table');
  } else {
    throw error;
  }
}

// Add include_in_totals and credit_limit to credit_cards table
try {
  db.exec(`
    ALTER TABLE credit_cards ADD COLUMN include_in_totals INTEGER NOT NULL DEFAULT 1
  `);
  console.log('✓ Added include_in_totals to credit_cards table');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('- include_in_totals already exists in credit_cards table');
  } else {
    throw error;
  }
}

try {
  db.exec(`
    ALTER TABLE credit_cards ADD COLUMN credit_limit REAL NOT NULL DEFAULT 0
  `);
  console.log('✓ Added credit_limit to credit_cards table');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('- credit_limit already exists in credit_cards table');
  } else {
    throw error;
  }
}

// Update existing credit cards to set credit_limit based on available_credit + current_balance
const creditCards = db.prepare('SELECT id, available_credit, current_balance FROM credit_cards').all() as any[];
const updateCreditLimit = db.prepare('UPDATE credit_cards SET credit_limit = ? WHERE id = ?');

for (const card of creditCards) {
  const creditLimit = card.available_credit + card.current_balance;
  updateCreditLimit.run(creditLimit, card.id);
}
console.log(`✓ Updated credit_limit for ${creditCards.length} credit cards`);

// Create imported_transactions table to track original CSV data
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_date TEXT NOT NULL,
      source_file TEXT NOT NULL,
      source_institution TEXT,
      transaction_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      original_data TEXT NOT NULL,
      hash TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Created imported_transactions table');
} catch (error: any) {
  if (error.message.includes('already exists')) {
    console.log('- imported_transactions table already exists');
  } else {
    throw error;
  }
}

// Create link table between imported transactions and split transactions
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_transaction_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imported_transaction_id INTEGER NOT NULL,
      transaction_id INTEGER NOT NULL,
      FOREIGN KEY (imported_transaction_id) REFERENCES imported_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Created imported_transaction_links table');
} catch (error: any) {
  if (error.message.includes('already exists')) {
    console.log('- imported_transaction_links table already exists');
  } else {
    throw error;
  }
}

console.log('\nMigration complete!');
db.close();

