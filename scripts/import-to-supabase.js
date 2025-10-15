#!/usr/bin/env node

/**
 * Import Data to Supabase
 * 
 * This script imports data from data-export.json into your Supabase production account.
 * 
 * Usage:
 *   node scripts/import-to-supabase.js
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (NOT anon key!)
 *   USER_ID - The UUID of the user to import data for
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.USER_ID;
const DATA_FILE = path.join(__dirname, '../data-export.json');

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !USER_ID) {
  console.error('❌ Missing required environment variables:\n');
  console.error('Required:');
  console.error('  SUPABASE_URL - Your Supabase project URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY - Your service role key (from Supabase Settings > API)');
  console.error('  USER_ID - Your user UUID (from Supabase Auth > Users)\n');
  console.error('Example:');
  console.error('  export SUPABASE_URL="https://xxx.supabase.co"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."');
  console.error('  export USER_ID="12345678-1234-1234-1234-123456789abc"');
  console.error('  node scripts/import-to-supabase.js\n');
  process.exit(1);
}

console.log('📊 Importing data to Supabase...\n');

async function importData() {
  try {
    // Read data file
    if (!fs.existsSync(DATA_FILE)) {
      throw new Error('data-export.json not found. Run export-sqlite-data.js first.');
    }
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔍 Verifying user exists...');
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(USER_ID);
    if (userError || !user) {
      throw new Error(`User ${USER_ID} not found. Check your USER_ID.`);
    }
    console.log(`✅ User found: ${user.user.email}\n`);
    
    // Import categories
    console.log('📁 Importing categories...');
    for (const category of data.categories) {
      const { id, created_at, updated_at, ...categoryData } = category;
      const { error } = await supabase
        .from('categories')
        .insert({ ...categoryData, user_id: USER_ID });
      if (error) throw error;
    }
    console.log(`✅ Imported ${data.categories.length} categories\n`);
    
    // Import accounts
    console.log('💰 Importing accounts...');
    for (const account of data.accounts) {
      const { id, created_at, updated_at, ...accountData } = account;
      const { error } = await supabase
        .from('accounts')
        .insert({ ...accountData, user_id: USER_ID });
      if (error) throw error;
    }
    console.log(`✅ Imported ${data.accounts.length} accounts\n`);
    
    // Import credit cards
    console.log('💳 Importing credit cards...');
    for (const card of data.credit_cards) {
      const { id, created_at, updated_at, ...cardData } = card;
      const { error } = await supabase
        .from('credit_cards')
        .insert({ ...cardData, user_id: USER_ID });
      if (error) throw error;
    }
    console.log(`✅ Imported ${data.credit_cards.length} credit cards\n`);
    
    // Import pending checks
    console.log('📝 Importing pending checks...');
    for (const check of data.pending_checks) {
      const { id, created_at, updated_at, ...checkData } = check;
      const { error } = await supabase
        .from('pending_checks')
        .insert({ ...checkData, user_id: USER_ID });
      if (error) throw error;
    }
    console.log(`✅ Imported ${data.pending_checks.length} pending checks\n`);
    
    // Import settings
    console.log('⚙️  Importing settings...');
    for (const setting of data.settings) {
      const { id, created_at, updated_at, ...settingData } = setting;
      const { error } = await supabase
        .from('settings')
        .insert({ ...settingData, user_id: USER_ID });
      if (error) throw error;
    }
    console.log(`✅ Imported ${data.settings.length} settings\n`);
    
    // Import merchant mappings
    console.log('🏪 Importing merchant mappings...');
    for (const mapping of data.merchant_mappings) {
      const { id, created_at, updated_at, ...mappingData } = mapping;
      const { error } = await supabase
        .from('merchant_mappings')
        .insert({ ...mappingData, user_id: USER_ID });
      if (error) throw error;
    }
    console.log(`✅ Imported ${data.merchant_mappings.length} merchant mappings\n`);
    
    console.log('🎉 Import complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importData();

