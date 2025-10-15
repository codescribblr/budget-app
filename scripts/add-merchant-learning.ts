import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'budget.db');
const db = new Database(dbPath);

console.log('Adding merchant learning tables...');

// Create merchant_mappings table to store learned categorizations
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchant_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_pattern TEXT NOT NULL,
      normalized_merchant TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      confidence_score INTEGER DEFAULT 1,
      last_used TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Created merchant_mappings table');
} catch (error: any) {
  if (error.message.includes('already exists')) {
    console.log('- merchant_mappings table already exists');
  } else {
    throw error;
  }
}

// Create index for faster lookups
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_merchant_mappings_normalized 
    ON merchant_mappings(normalized_merchant)
  `);
  console.log('✓ Created index on normalized_merchant');
} catch (error: any) {
  console.log('- Index already exists or error:', error.message);
}

// Create index for category lookups
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_merchant_mappings_category 
    ON merchant_mappings(category_id)
  `);
  console.log('✓ Created index on category_id');
} catch (error: any) {
  console.log('- Index already exists or error:', error.message);
}

console.log('\n✅ Merchant learning migration complete!');

db.close();

