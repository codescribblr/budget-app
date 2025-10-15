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

