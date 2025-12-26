import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { exportAccountData } from '@/lib/backup-utils';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { compressBackup } from '@/lib/backup-storage';
import { getUserSubscription, isPremiumUser } from '@/lib/subscription-utils';

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

    // Get subscription to determine max backup limit
    const subscription = await getUserSubscription(accountId);
    const isPremium = isPremiumUser(subscription);
    const maxBackups = isPremium ? 10 : 3;

    return NextResponse.json({ 
      backups: backups || [],
      maxBackups,
      isPremium,
    });
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

    // Check subscription for backup limit (free: 3, premium: 10)
    const subscription = await getUserSubscription(accountId);
    const isPremium = isPremiumUser(subscription);
    const backupLimit = isPremium ? 10 : 3;

    // Check if account already has max backups
    const { data: existingBackups, error: countError } = await supabase
      .from('user_backups')
      .select('id')
      .eq('account_id', accountId);

    if (countError) throw countError;

    if (existingBackups && existingBackups.length >= backupLimit) {
      const limitMessage = isPremium 
        ? 'Maximum of 10 backups allowed for premium accounts.'
        : 'Maximum of 3 backups allowed. Upgrade to premium for up to 10 backups.';
      return NextResponse.json(
        { error: limitMessage },
        { status: 400 }
      );
    }

    // Export all account data
    const backupData = await exportAccountData();

    // Compress backup data
    const compressedData = await compressBackup(backupData);

    // Generate unique filename using timestamp and random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const storagePath = `${accountId}/${timestamp}-${randomStr}.json.gz`;

    // Upload compressed backup to Storage first
    try {
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(storagePath, compressedData, {
          contentType: 'application/gzip',
          upsert: false,
        });

      if (uploadError) throw uploadError;
    } catch (uploadErr: any) {
      console.error('Error uploading backup to storage:', uploadErr);
      throw new Error(`Failed to upload backup: ${uploadErr.message}`);
    }

    // Create backup record with storage path
    const { data: backup, error: insertError } = await supabase
      .from('user_backups')
      .insert({
        user_id: user.id, // Required for backward compatibility and RLS
        account_id: accountId,
        created_by: user.id,
        storage_path: storagePath,
        backup_data: null, // No longer storing in database
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      // If DB insert failed, try to clean up the uploaded file
      try {
        await supabase.storage.from('backups').remove([storagePath]);
      } catch (cleanupErr) {
        console.error('Failed to cleanup uploaded backup after DB error:', cleanupErr);
      }
      throw insertError;
    }

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

