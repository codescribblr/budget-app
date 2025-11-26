import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Performs setup actions required when premium features are enabled
 * Currently handles:
 * - Creating/ensuring Income Buffer category exists and is properly configured
 * 
 * @param supabase - Supabase client instance
 * @param accountId - Account ID to set up features for
 * @param userId - User ID (required for categories table)
 * @returns Promise that resolves when setup is complete
 */
export async function setupPremiumFeatures(
  supabase: SupabaseClient,
  accountId: number,
  userId: string
): Promise<void> {
  // Ensure Income Buffer category exists and is properly configured
  await ensureIncomeBufferCategory(supabase, accountId, userId);
}

/**
 * Ensures the Income Buffer category exists and is properly configured
 * - Creates it if it doesn't exist
 * - Re-enables it if it exists but was disabled
 * - Does nothing if it's already properly configured
 */
async function ensureIncomeBufferCategory(
  supabase: SupabaseClient,
  accountId: number,
  userId: string
): Promise<void> {
  // Check if Income Buffer category already exists
  const { data: existingBuffer, error: bufferCheckError } = await supabase
    .from('categories')
    .select('id, is_system, is_buffer')
    .eq('account_id', accountId)
    .eq('name', 'Income Buffer')
    .maybeSingle();

  if (bufferCheckError) {
    console.error('Error checking for Income Buffer category:', bufferCheckError);
    return; // Don't fail, just log the error
  }

  if (existingBuffer) {
    // Category exists but might have been disabled - re-enable it
    if (!existingBuffer.is_system || !existingBuffer.is_buffer) {
      const { error: updateError } = await supabase
        .from('categories')
        .update({
          is_system: true,
          is_buffer: true,
          notes: 'Special category for smoothing irregular income. Add large payments here and withdraw monthly.',
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('name', 'Income Buffer');

      if (updateError) {
        console.error('Error re-enabling Income Buffer category:', updateError);
      } else {
        console.log('✅ Re-enabled Income Buffer category');
      }
    }
    // If already properly configured, do nothing
  } else {
    // Create Income Buffer category
    const { error: createError } = await supabase
      .from('categories')
      .insert({
        account_id: accountId,
        user_id: userId, // Required by categories table
        name: 'Income Buffer',
        monthly_amount: 0,
        current_balance: 0,
        sort_order: -1, // Put at top
        is_system: true,
        is_buffer: true, // Special flag: doesn't show in dropdowns but counts in totals
        category_type: 'target_balance',
        priority: 10, // Lowest priority (never auto-funded)
        notes: 'Special category for smoothing irregular income. Add large payments here and withdraw monthly.',
      });

    if (createError) {
      console.error('Error creating Income Buffer category:', createError);
    } else {
      console.log('✅ Created Income Buffer category');
    }
  }
}

