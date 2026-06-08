import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { importUserDataFromFile, isBackupDataType, validateImportSelection, type UserBackupData, type BackupDataType } from '@/lib/backup-utils';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { downloadBackupFromStorage, decompressBackup } from '@/lib/backup-storage';

/**
 * POST /api/backups/[id]/restore
 * Restore account data from a specific backup
 * Account owners and editors can restore backups
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has write access (owner or editor)
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const backupId = parseInt(id);

    if (isNaN(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 });
    }

    // Fetch the backup record (check account_id instead of user_id)
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

    // Support both new (storage) and legacy (JSONB) backups
    if (backup.storage_path) {
      // New format: download and decompress from Storage
      const compressedData = await downloadBackupFromStorage(backup.storage_path);
      const decompressed = await decompressBackup(compressedData);
      backupData = decompressed as UserBackupData;
    } else if (backup.backup_data) {
      // Legacy format: use JSONB data directly
      backupData = backup.backup_data as UserBackupData;
    } else {
      return NextResponse.json({ error: 'Backup data not found' }, { status: 404 });
    }

    let selectedTypes: BackupDataType[] | undefined;
    try {
      const body = await request.json();
      if (body?.selectedTypes) {
        if (!Array.isArray(body.selectedTypes)) {
          return NextResponse.json(
            { error: 'selectedTypes must be an array' },
            { status: 400 }
          );
        }
        const invalid = body.selectedTypes.filter(
          (type: string) => !isBackupDataType(type)
        );
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: `Invalid data types: ${invalid.join(', ')}` },
            { status: 400 }
          );
        }
        selectedTypes = body.selectedTypes as BackupDataType[];

        if (selectedTypes.length === 0) {
          return NextResponse.json(
            { error: 'Select at least one data type to restore' },
            { status: 400 }
          );
        }

        const validation = validateImportSelection(backupData, selectedTypes);
        if (!validation.valid) {
          return NextResponse.json(
            {
              error: 'Backup is missing required related data for the selected types',
              missingDependencies: validation.missingDependencies,
            },
            { status: 400 }
          );
        }
      }
    } catch {
      // Empty body restores all data
    }

    // Restore the data
    await importUserDataFromFile(backupData, selectedTypes ? { selectedTypes } : undefined);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    
    // Check if this is a permission error
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission') || error.message?.includes('read-only') || error.message?.includes('Viewers can only view')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners and editors can restore backups.' },
        { status: 403 }
      );
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to restore backup' },
      { status: 500 }
    );
  }
}


