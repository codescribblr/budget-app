import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import {
  getBackupRecordCount,
  getTypesPresentInBackup,
  type BackupDataType,
} from '@/lib/backup-data-types';
import { BACKUP_DATA_TYPES } from '@/lib/backup-data-types';
import type { UserBackupData } from '@/lib/backup-utils';
import { downloadBackupFromStorage, decompressBackup } from '@/lib/backup-storage';

/**
 * GET /api/backups/[id]/preview
 * Returns data type summary for a stored backup without sending the full payload.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const backupId = parseInt(id);
    if (isNaN(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 });
    }

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

    let backupData: UserBackupData;
    if (backup.storage_path) {
      const compressedData = await downloadBackupFromStorage(backup.storage_path);
      backupData = (await decompressBackup(compressedData)) as UserBackupData;
    } else if (backup.backup_data) {
      backupData = backup.backup_data as UserBackupData;
    } else {
      return NextResponse.json({ error: 'Backup data not found' }, { status: 404 });
    }

    const typesPresent = getTypesPresentInBackup(backupData);
    const recordCounts = Object.fromEntries(
      BACKUP_DATA_TYPES.map((type) => [type, getBackupRecordCount(backupData, type)])
    ) as Record<BackupDataType, number>;

    return NextResponse.json({
      version: backupData.version,
      created_at: backupData.created_at,
      typesPresent,
      recordCounts,
      included_types: backupData.included_types ?? typesPresent,
    });
  } catch (error: unknown) {
    console.error('Error previewing backup:', error);
    const message = error instanceof Error ? error.message : 'Failed to preview backup';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
