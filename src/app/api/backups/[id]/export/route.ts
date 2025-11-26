import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

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

    // Fetch the backup data (RLS ensures user has access)
    const { data: backup, error: fetchError } = await supabase
      .from('user_backups')
      .select('backup_data')
      .eq('id', backupId)
      .eq('account_id', accountId)
      .single();

    if (fetchError) throw fetchError;

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Return the backup data as JSON
    return NextResponse.json(backup.backup_data);
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

