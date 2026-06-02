import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { ExternalApiNotFoundError, getExternalDb } from '@/lib/external-api/query-helpers';
import { stripExternalApiExportData } from '@/lib/external-api/sanitize-export';
import { downloadBackupFromStorage, decompressBackup } from '@/lib/backup-storage';

export const GET = externalApiIdRoute('backup', async (_request, context, id) => {
  const supabase = getExternalDb();
  const { data: backup, error } = await supabase
    .from('user_backups')
    .select('storage_path, backup_data')
    .eq('id', id)
    .eq('account_id', context.budgetAccountId)
    .single();

  if (error || !backup) {
    throw new ExternalApiNotFoundError('Backup not found');
  }

  let backupData: unknown;
  if (backup.storage_path) {
    const compressedData = await downloadBackupFromStorage(backup.storage_path);
    backupData = await decompressBackup(compressedData);
  } else if (backup.backup_data) {
    backupData = backup.backup_data;
  } else {
    throw new ExternalApiNotFoundError('Backup data not found');
  }

  return NextResponse.json(externalApiData(stripExternalApiExportData(backupData as Record<string, unknown>), context));
});

export const DELETE = externalApiIdRoute('backup', async (_request, context, id) => {
  const supabase = getExternalDb();
  const { data: backup, error: fetchError } = await supabase
    .from('user_backups')
    .select('storage_path')
    .eq('id', id)
    .eq('account_id', context.budgetAccountId)
    .single();

  if (fetchError || !backup) {
    throw new ExternalApiNotFoundError('Backup not found');
  }

  if (backup.storage_path) {
    await supabase.storage.from('backups').remove([backup.storage_path]);
  }

  const { error } = await supabase
    .from('user_backups')
    .delete()
    .eq('id', id)
    .eq('account_id', context.budgetAccountId);

  if (error) throw error;
  return NextResponse.json(externalApiData({ success: true }, context));
});
