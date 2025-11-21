import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { importUserData, UserBackupData } from '@/lib/backup-utils';

/**
 * POST /api/backups/import
 * Import user data from an uploaded backup file
 */
export async function POST(request: Request) {
  try {
    await getAuthenticatedUser(); // Verify authentication

    const backupData: UserBackupData = await request.json();

    // Validate that the backup data has the required structure
    if (!backupData.version || !backupData.created_at) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      );
    }

    // Import the data
    await importUserData(backupData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error importing backup:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to import backup' },
      { status: 500 }
    );
  }
}

