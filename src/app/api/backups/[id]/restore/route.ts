import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { importUserData, UserBackupData } from '@/lib/backup-utils';

/**
 * POST /api/backups/[id]/restore
 * Restore user data from a specific backup
 */
export async function POST(
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

    // Fetch the backup data
    const { data: backup, error: fetchError } = await supabase
      .from('user_backups')
      .select('backup_data')
      .eq('id', backupId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Restore the data
    await importUserData(backup.backup_data as UserBackupData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

