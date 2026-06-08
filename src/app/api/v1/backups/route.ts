import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { exportAccountDataForAccount } from '@/lib/backup-utils';
import { compressBackup } from '@/lib/backup-storage';
import { getExternalDb } from '@/lib/external-api/query-helpers';
import { stripExternalApiExportData } from '@/lib/external-api/sanitize-export';
import { isPremiumUser } from '@/lib/subscription-utils';

export const GET = withExternalApi('backup', async (_request, context) => {
  const supabase = getExternalDb();
  const { data: backups, error } = await supabase
    .from('user_backups')
    .select('id, created_at, storage_path')
    .eq('account_id', context.budgetAccountId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('account_id', context.budgetAccountId)
    .maybeSingle();

  return NextResponse.json(
    externalApiData(
      {
        backups: backups ?? [],
        isPremium: isPremiumUser(subscription),
      },
      context
    )
  );
});

export const POST = withExternalApi('backup', async (_request, context) => {
  const supabase = getExternalDb();
  const backupData = stripExternalApiExportData(
    await exportAccountDataForAccount(context.budgetAccountId, context.createdBy)
  );
  const compressedData = await compressBackup(backupData);

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const storagePath = `${context.budgetAccountId}/${timestamp}-${randomStr}.json.gz`;

  const { error: uploadError } = await supabase.storage
    .from('backups')
    .upload(storagePath, compressedData, {
      contentType: 'application/gzip',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: backup, error: insertError } = await supabase
    .from('user_backups')
    .insert({
      user_id: context.createdBy,
      account_id: context.budgetAccountId,
      created_by: context.createdBy,
      storage_path: storagePath,
      backup_data: null,
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    await supabase.storage.from('backups').remove([storagePath]);
    throw insertError;
  }

  return NextResponse.json(externalApiData({ backup }, context), { status: 201 });
});
