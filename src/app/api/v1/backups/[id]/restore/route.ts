import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { ExternalApiNotFoundError, ExternalApiValidationError, getExternalDb } from '@/lib/external-api/query-helpers';
import { importAccountDataForAccount } from '@/lib/backup-utils';
import type { UserBackupData } from '@/lib/backup-utils';
import { downloadBackupFromStorage, decompressBackup } from '@/lib/backup-storage';
import { stripExternalApiExportData } from '@/lib/external-api/sanitize-export';

export const POST = externalApiIdRoute('backup', async (request, context, id) => {
  const confirm = request.headers.get('x-confirm-action');
  if (confirm !== 'restore-backup') {
    throw new ExternalApiValidationError(
      'Restore requires header X-Confirm-Action: restore-backup'
    );
  }

  const supabase = getExternalDb();
  const { data: backup, error: fetchError } = await supabase
    .from('user_backups')
    .select('storage_path, backup_data')
    .eq('id', id)
    .eq('account_id', context.budgetAccountId)
    .single();

  if (fetchError || !backup) {
    throw new ExternalApiNotFoundError('Backup not found');
  }

  let backupData: UserBackupData;
  if (backup.storage_path) {
    const compressedData = await downloadBackupFromStorage(backup.storage_path);
    backupData = (await decompressBackup(compressedData)) as UserBackupData;
  } else if (backup.backup_data) {
    backupData = backup.backup_data as UserBackupData;
  } else {
    throw new ExternalApiNotFoundError('Backup data not found');
  }

  await importAccountDataForAccount(
    context.budgetAccountId,
    context.createdBy,
    stripExternalApiExportData(backupData) as UserBackupData
  );

  return NextResponse.json(externalApiData({ success: true }, context));
});
