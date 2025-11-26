import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { importUserDataFromFile, UserBackupData } from '@/lib/backup-utils';
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

    const backupData: UserBackupData = await request.json();

    // Validate that the backup data has the required structure
    if (!backupData.version || !backupData.created_at) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      );
    }

    // Import the data (remaps user_id to current user)
    await importUserDataFromFile(backupData);

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

