import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { deleteBackupFromStorage } from '@/lib/backup-storage';

/**
 * DELETE /api/backups/[id]
 * Delete a specific backup
 * Account owners and editors can delete backups
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has write access (owner or editor)
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const { id } = await params;
    const backupId = parseInt(id);

    if (isNaN(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Fetch backup to get storage path before deletion
    const { data: backup, error: fetchError } = await supabase
      .from('user_backups')
      .select('storage_path')
      .eq('id', backupId)
      .eq('account_id', accountId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from Storage if it exists
    if (backup?.storage_path) {
      await deleteBackupFromStorage(backup.storage_path);
    }

    // Delete the backup record (RLS policy ensures account owner/editor can delete)
    const { error } = await supabase
      .from('user_backups')
      .delete()
      .eq('id', backupId)
      .eq('account_id', accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    
    // Check if this is a permission error
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission') || error.message?.includes('read-only') || error.message?.includes('Viewers can only view')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners and editors can delete backups.' },
        { status: 403 }
      );
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete backup' },
      { status: 500 }
    );
  }
}


