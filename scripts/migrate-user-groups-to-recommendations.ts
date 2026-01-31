/**
 * Script to migrate user merchant groups to recommendations
 * This converts all existing user merchant groups into pending recommendations
 * 
 * Run this script after migration 085 to complete the migration process
 * Usage: npx tsx scripts/migrate-user-groups-to-recommendations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateUserGroupsToRecommendations() {
  console.log('Starting migration of user merchant groups to recommendations...');

  try {
    // Get all user merchant groups that aren't linked to global merchants
    const { data: userGroups, error: groupsError } = await supabase
      .from('merchant_groups')
      .select('id, user_id, account_id, display_name')
      .is('global_merchant_id', null);

    if (groupsError) throw groupsError;

    if (!userGroups || userGroups.length === 0) {
      console.log('No user merchant groups found to migrate');
      return;
    }

    console.log(`Found ${userGroups.length} user merchant groups to migrate`);

    let recommendationsCreated = 0;
    let patternsStored = 0;

    for (const group of userGroups) {
      // Get all patterns for this group
      const { data: mappings, error: mappingsError } = await supabase
        .from('merchant_mappings')
        .select('pattern')
        .eq('merchant_group_id', group.id);

      if (mappingsError) {
        console.error(`Error fetching mappings for group ${group.id}:`, mappingsError);
        continue;
      }

      if (!mappings || mappings.length === 0) {
        console.log(`Skipping group ${group.id} (${group.display_name}) - no patterns`);
        continue;
      }

      // Use the first pattern as representative
      const representativePattern = mappings[0].pattern;

      // Create recommendation
      const { data: recommendation, error: recError } = await supabase
        .from('merchant_recommendations')
        .insert({
          user_id: group.user_id,
          account_id: group.account_id,
          pattern: representativePattern,
          suggested_merchant_name: group.display_name,
          status: 'pending',
          original_merchant_group_id: group.id,
          pattern_count: mappings.length,
        })
        .select()
        .single();

      if (recError) {
        console.error(`Error creating recommendation for group ${group.id}:`, recError);
        continue;
      }

      recommendationsCreated++;

      // Store all patterns
      const patternInserts = mappings.map(m => ({
        recommendation_id: recommendation.id,
        pattern: m.pattern,
      }));

      const { error: patternsError } = await supabase
        .from('merchant_recommendation_patterns')
        .insert(patternInserts);

      if (patternsError) {
        console.error(`Error storing patterns for recommendation ${recommendation.id}:`, patternsError);
      } else {
        patternsStored += patternInserts.length;
      }

      console.log(`Created recommendation ${recommendation.id} for "${group.display_name}" with ${mappings.length} patterns`);
    }

    console.log('\nMigration Summary:');
    console.log(`- Recommendations created: ${recommendationsCreated}`);
    console.log(`- Patterns stored: ${patternsStored}`);
    console.log('\nNext steps:');
    console.log('1. Review recommendations in admin panel');
    console.log('2. Approve/merge recommendations');
    console.log('3. Run cleanup script to delete old user groups and mappings');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function cleanupAfterMigration() {
  console.log('\nCleaning up old user merchant groups and mappings...');
  console.log('WARNING: This will delete all user merchant groups and mappings!');
  console.log('Only run this after all recommendations have been reviewed and approved.');

  // This would be run separately after admin review
  // Uncomment to enable:
  /*
  try {
    // Delete all merchant mappings
    const { error: mappingsError } = await supabase
      .from('merchant_mappings')
      .delete()
      .neq('id', 0); // Delete all

    if (mappingsError) throw mappingsError;
    console.log('Deleted all merchant mappings');

    // Delete all merchant groups
    const { error: groupsError } = await supabase
      .from('merchant_groups')
      .delete()
      .neq('id', 0); // Delete all

    if (groupsError) throw groupsError;
    console.log('Deleted all merchant groups');

    // Reset transaction merchant_group_id
    const { error: txError } = await supabase
      .from('transactions')
      .update({ merchant_group_id: null })
      .neq('merchant_group_id', null);

    if (txError) throw txError;
    console.log('Reset transaction merchant_group_id references');

    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
  */
}

// Run migration
if (process.argv.includes('--cleanup')) {
  cleanupAfterMigration();
} else {
  migrateUserGroupsToRecommendations();
}
