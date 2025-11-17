import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * DELETE /api/user/clear-data
 * 
 * Clears all data for the authenticated user.
 * This is a destructive action that cannot be undone.
 */
export async function DELETE() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Delete in order (respecting foreign key constraints)
    // Note: transaction_splits and imported_transaction_links don't have user_id
    // They will be deleted automatically via CASCADE when their parent records are deleted
    const tables = [
      'transactions',           // This will CASCADE delete transaction_splits
      'imported_transactions',  // This will CASCADE delete imported_transaction_links
      'merchant_category_rules',
      'merchant_mappings',
      'merchant_groups',
      'pending_checks',
      'pre_tax_deductions',
      'income_settings',
      'credit_cards',
      'accounts',
      'categories',
      'settings',
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error(`Error deleting ${table}:`, error);
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'All user data cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing user data:', error);
    return NextResponse.json(
      { error: 'Failed to clear user data' },
      { status: 500 }
    );
  }
}

