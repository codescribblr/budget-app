#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * This script runs all SQL migration files in the migrations/ folder
 * against the Supabase database.
 * 
 * Usage:
 *   node scripts/run-migrations.js
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (not anon key!)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
  });

  if (error) {
    // If RPC doesn't exist, try direct SQL execution
    // This is a fallback - you may need to create the table manually first
    console.log('⚠️  Note: Could not create migrations table via RPC');
    console.log('   Please create it manually in Supabase SQL Editor:');
    console.log('   CREATE TABLE IF NOT EXISTS _migrations (');
    console.log('     id SERIAL PRIMARY KEY,');
    console.log('     migration_name TEXT NOT NULL UNIQUE,');
    console.log('     executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    console.log('   );');
    console.log('');
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from('_migrations')
    .select('migration_name');

  if (error) {
    // Table might not exist yet
    return [];
  }

  return data.map(row => row.migration_name);
}

/**
 * Record a migration as executed
 */
async function recordMigration(migrationName) {
  const { error } = await supabase
    .from('_migrations')
    .insert({ migration_name: migrationName });

  if (error) {
    throw new Error(`Failed to record migration: ${error.message}`);
  }
}

/**
 * Get all migration files sorted by name
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files;
}

/**
 * Execute a SQL migration file
 */
async function executeMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`📝 Running migration: ${filename}`);

  // Split SQL into individual statements (simple split on semicolon)
  // Note: This is a basic implementation and may not handle all edge cases
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (!statement || statement.startsWith('--')) continue;

    try {
      // Use raw SQL execution via Supabase REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql: statement })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SQL execution failed: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error executing statement ${i + 1}:`, error.message);
      console.error(`   Statement: ${statement.substring(0, 100)}...`);
      throw error;
    }
  }

  console.log(`✅ Migration completed: ${filename}`);
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Create migrations tracking table
    await createMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📊 Found ${executedMigrations.length} previously executed migrations\n`);

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files\n`);

    // Filter out already executed migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations to run');
      return;
    }

    console.log(`⏳ Running ${pendingMigrations.length} pending migrations...\n`);

    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
      await recordMigration(migration);
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();


