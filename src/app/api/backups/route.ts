import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { exportAccountData } from '@/lib/backup-utils';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * GET /api/backups
 * List all backups for the authenticated user
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { data: backups, error } = await supabase
      .from('user_backups')
      .select('id, created_at')
      .eq('account_id', accountId)
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
 * Account owners and editors can create backups
 */
export async function POST() {
  try {
    // Check if user has write access (owner or editor)
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Check if account already has 3 backups
    const { data: existingBackups, error: countError } = await supabase
      .from('user_backups')
      .select('id')
      .eq('account_id', accountId);

    if (countError) throw countError;

    if (existingBackups && existingBackups.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 backups allowed. Please delete an old backup before creating a new one.' },
        { status: 400 }
      );
    }

    // Export all account data
    const backupData = await exportAccountData();

    // Save the backup
    const { data: backup, error: insertError } = await supabase
      .from('user_backups')
      .insert({
        account_id: accountId,
        created_by: user.id,
        backup_data: backupData,
      })
      .select('id, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ backup });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    
    // Check if this is a permission error
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission') || error.message?.includes('read-only') || error.message?.includes('Viewers can only view')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners and editors can create backups.' },
        { status: 403 }
      );
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create backup' },
      { status: 500 }
    );
  }
}

