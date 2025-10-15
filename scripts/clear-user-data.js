#!/usr/bin/env node

/**
 * Clear User Data from Supabase
 * 
 * This script deletes ALL data for a specific user from Supabase.
 * Use this to clear test data before importing your real data.
 * 
 * ⚠️  WARNING: This is destructive and cannot be undone!
 * 
 * Usage:
 *   node scripts/clear-user-data.js
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key
 *   USER_ID - The UUID of the user whose data to delete
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.USER_ID;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !USER_ID) {
  console.error('❌ Missing required environment variables:\n');
  console.error('Required:');
  console.error('  SUPABASE_URL - Your Supabase project URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY - Your service role key');
  console.error('  USER_ID - Your user UUID\n');
  process.exit(1);
}

async function clearUserData() {
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user exists
    console.log('🔍 Verifying user...');
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(USER_ID);
    if (userError || !user) {
      throw new Error(`User ${USER_ID} not found.`);
    }
    console.log(`✅ User found: ${user.user.email}\n`);
    
    // Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL data for this user:');
    console.log(`   - User: ${user.user.email}`);
    console.log(`   - User ID: ${USER_ID}`);
    console.log('\n   This includes:');
    console.log('   - All categories');
    console.log('   - All accounts');
    console.log('   - All credit cards');
    console.log('   - All transactions');
    console.log('   - All pending checks');
    console.log('   - All settings');
    console.log('   - All merchant mappings');
    console.log('   - All imported transactions\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Type "DELETE" to confirm: ', resolve);
    });
    rl.close();
    
    if (answer !== 'DELETE') {
      console.log('\n❌ Cancelled. No data was deleted.');
      process.exit(0);
    }
    
    console.log('\n🗑️  Deleting user data...\n');
    
    // Delete in order (respecting foreign key constraints)
    const tables = [
      'transaction_splits',
      'transactions',
      'imported_transaction_links',
      'imported_transactions',
      'merchant_mappings',
      'pending_checks',
      'credit_cards',
      'accounts',
      'categories',
      'settings',
    ];
    
    for (const table of tables) {
      console.log(`   Deleting ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', USER_ID);
      
      if (error) {
        console.error(`   ❌ Error deleting ${table}:`, error.message);
      } else {
        console.log(`   ✅ Deleted ${table}`);
      }
    }
    
    console.log('\n✅ User data cleared!\n');
    console.log('💡 Next step: Run import-to-supabase.js to load your data\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearUserData();

