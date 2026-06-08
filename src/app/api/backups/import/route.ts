import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import {
  importUserDataFromFile,
  isBackupDataType,
  validateImportSelection,
  type UserBackupData,
  type BackupDataType,
} from '@/lib/backup-utils';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/backups/import
 * Import account data from an uploaded backup file
 * Account owners and editors can import backups
 */
export async function POST(request: Request) {
  try {
    // Check if user has write access (owner or editor)
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    await getAuthenticatedUser(); // Verify authentication

    const body = await request.json();
    const backupData: UserBackupData = body.backupData ?? body;

    // Validate that the backup data has the required structure
    if (!backupData.version || !backupData.created_at) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      );
    }

    let selectedTypes: BackupDataType[] | undefined;
    if (body.selectedTypes) {
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
          { error: 'Select at least one data type to import' },
          { status: 400 }
        );
      }

      const validation = validateImportSelection(backupData, selectedTypes);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Backup file is missing required related data for the selected types',
            missingDependencies: validation.missingDependencies,
          },
          { status: 400 }
        );
      }
    }

    // Import the data (remaps user_id to current user and account_id to active account)
    await importUserDataFromFile(backupData, selectedTypes ? { selectedTypes } : undefined);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error importing backup:', error);
    
    // Check if this is a permission error
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission') || error.message?.includes('read-only') || error.message?.includes('Viewers can only view')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners and editors can import backups.' },
        { status: 403 }
      );
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to import backup' },
      { status: 500 }
    );
  }
}


