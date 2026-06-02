import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { exportAccountDataForAccount } from '@/lib/backup-utils';
import { hasScope } from '@/lib/external-api/scopes';
import { stripExternalApiExportData } from '@/lib/external-api/sanitize-export';
import type { ApiScopeSection } from '@/lib/external-api/types';

const SECTION_EXPORT_KEYS: Partial<Record<ApiScopeSection, keyof Awaited<ReturnType<typeof exportAccountDataForAccount>>>> = {
  transactions: 'transactions',
  categories: 'categories',
  accounts: 'accounts',
  credit_cards: 'credit_cards',
  loans: 'loans',
  non_cash_assets: 'non_cash_assets',
  pending_checks: 'pending_checks',
  goals: 'goals',
  income: 'income_streams',
  imports: 'csv_import_templates',
  merchants: 'merchant_groups',
  tags: 'tags',
  recurring_transactions: 'recurring_transactions',
  notifications: 'notifications',
  settings: 'settings',
  collaborators: 'account_users',
  backup: 'accounts',
};

export const GET = withExternalApi('backup', async (request, context) => {
  const sectionsParam = request.nextUrl.searchParams.get('sections');
  const exportData = stripExternalApiExportData(
    await exportAccountDataForAccount(context.budgetAccountId, context.createdBy)
  );

  if (!sectionsParam) {
    return NextResponse.json(externalApiData(exportData, context));
  }

  const requestedSections = sectionsParam.split(',').map((s) => s.trim()) as ApiScopeSection[];
  const filtered: Record<string, unknown> = {
    version: exportData.version,
    created_at: exportData.created_at,
    created_by: exportData.created_by,
    account: exportData.account,
  };

  for (const section of requestedSections) {
    if (!hasScope(context.permissions, section, 'read')) continue;
    const key = SECTION_EXPORT_KEYS[section];
    if (key && key in exportData) {
      filtered[key as string] = exportData[key as keyof typeof exportData];
    }
  }

  return NextResponse.json(externalApiData(filtered, context));
});
