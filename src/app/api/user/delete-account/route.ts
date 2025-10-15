import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * DELETE /api/user/delete-account
 * 
 * Deletes the user's account and all associated data.
 * This is a destructive action that cannot be undone.
 */
export async function DELETE() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // First, delete all user data (same as clear-data)
    // Note: transaction_splits and imported_transaction_links don't have user_id
    // They will be deleted automatically via CASCADE when their parent records are deleted
    const tables = [
      'transactions',           // This will CASCADE delete transaction_splits
      'imported_transactions',  // This will CASCADE delete imported_transaction_links
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

    // Then delete the user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user account:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

