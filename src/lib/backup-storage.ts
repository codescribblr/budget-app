import { createClient } from './supabase/server';
import { gzip as zlibGzip, gunzip as zlibGunzip } from 'zlib';
import { promisify } from 'util';
import type { AccountBackupData } from './backup-utils';

const gzip = promisify(zlibGzip);
const gunzip = promisify(zlibGunzip);

const BACKUP_BUCKET = 'backups';

/**
 * Ensure the backups bucket exists in Supabase Storage
 */
async function ensureBackupBucket() {
  const supabase = await createClient();
  
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    throw new Error('Failed to access storage');
  }
  
  const backupBucket = buckets?.find(b => b.name === BACKUP_BUCKET);
  
  if (!backupBucket) {
    // Create bucket if it doesn't exist
    // Note: This requires service role client or admin access
    // For now, we'll assume the bucket is created manually or via migration
    console.warn(`Backup bucket '${BACKUP_BUCKET}' does not exist. Please create it in Supabase Storage.`);
  }
}

/**
 * Compress backup data using gzip
 */
export async function compressBackup(backupData: AccountBackupData): Promise<Buffer> {
  const jsonString = JSON.stringify(backupData);
  const compressed = await gzip(Buffer.from(jsonString, 'utf-8'));
  return compressed;
}

/**
 * Decompress backup data from gzip
 */
export async function decompressBackup(compressedData: Buffer): Promise<AccountBackupData> {
  const decompressed = await gunzip(compressedData);
  const jsonString = decompressed.toString('utf-8');
  return JSON.parse(jsonString) as AccountBackupData;
}

/**
 * Upload backup to Supabase Storage
 * Note: This function is kept for backward compatibility but is no longer used
 * The upload is now done directly in the API route
 */
export async function uploadBackupToStorage(
  accountId: number,
  backupId: number,
  compressedData: Buffer
): Promise<string> {
  const supabase = await createClient();
  
  // Ensure bucket exists
  await ensureBackupBucket();
  
  // Create storage path: backups/{account_id}/{backup_id}.json.gz
  const storagePath = `${accountId}/${backupId}.json.gz`;
  
  // Upload compressed backup
  const { error: uploadError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(storagePath, compressedData, {
      contentType: 'application/gzip',
      upsert: false, // Don't overwrite existing backups
    });
  
  if (uploadError) {
    console.error('Error uploading backup to storage:', uploadError);
    throw new Error(`Failed to upload backup: ${uploadError.message}`);
  }
  
  return storagePath;
}

/**
 * Download backup from Supabase Storage
 */
export async function downloadBackupFromStorage(storagePath: string): Promise<Buffer> {
  const supabase = await createClient();
  
  const { data, error: downloadError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .download(storagePath);
  
  if (downloadError) {
    console.error('Error downloading backup from storage:', downloadError);
    throw new Error(`Failed to download backup: ${downloadError.message}`);
  }
  
  if (!data) {
    throw new Error('Backup file not found in storage');
  }
  
  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete backup from Supabase Storage
 */
export async function deleteBackupFromStorage(storagePath: string): Promise<void> {
  const supabase = await createClient();
  
  const { error: deleteError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .remove([storagePath]);
  
  if (deleteError) {
    console.error('Error deleting backup from storage:', deleteError);
    // Don't throw - allow deletion to continue even if storage deletion fails
    // The database record will still be deleted
  }
}


