import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { exportUserData } from '@/lib/backup-utils';

/**
 * GET /api/backups
 * List all backups for the authenticated user
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const { data: backups, error } = await supabase
      .from('user_backups')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ backups: backups || [] });
  } catch (error: any) {
    console.error('Error fetching backups:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backups
 * Create a new backup for the authenticated user
 */
export async function POST() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Check if user already has 3 backups
    const { data: existingBackups, error: countError } = await supabase
      .from('user_backups')
      .select('id')
      .eq('user_id', user.id);

    if (countError) throw countError;

    if (existingBackups && existingBackups.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 backups allowed. Please delete an old backup before creating a new one.' },
        { status: 400 }
      );
    }

    // Export all user data
    const backupData = await exportUserData();

    // Save the backup
    const { data: backup, error: insertError } = await supabase
      .from('user_backups')
      .insert({
        user_id: user.id,
        backup_data: backupData,
      })
      .select('id, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ backup });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

