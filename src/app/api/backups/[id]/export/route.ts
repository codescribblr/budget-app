import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { downloadBackupFromStorage, decompressBackup } from '@/lib/backup-storage';

/**
 * GET /api/backups/[id]/export
 * Export a specific backup as JSON for download
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Fetch the backup record (RLS ensures user has access)
    const { data: backup, error: fetchError } = await supabase
      .from('user_backups')
      .select('storage_path, backup_data')
      .eq('id', backupId)
      .eq('account_id', accountId)
      .single();

    if (fetchError) throw fetchError;

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    let backupData: any;

    // Support both new (storage) and legacy (JSONB) backups
    if (backup.storage_path) {
      // New format: download and decompress from Storage
      const compressedData = await downloadBackupFromStorage(backup.storage_path);
      backupData = await decompressBackup(compressedData);
    } else if (backup.backup_data) {
      // Legacy format: use JSONB data directly
      backupData = backup.backup_data;
    } else {
      return NextResponse.json({ error: 'Backup data not found' }, { status: 404 });
    }

    // Return the backup data as JSON
    return NextResponse.json(backupData);
  } catch (error: any) {
    console.error('Error exporting backup:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to export backup' },
      { status: 500 }
    );
  }
}


