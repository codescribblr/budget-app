import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import {
  importUserDataFromFile,
  isBackupDataType,
  validateImportSelection,
  type UserBackupData,
  type BackupDataType,
} from '@/lib/backup-utils';
import { validateBackupJsonString, validateBackupPayload } from '@/lib/backup-validation';
import { checkWriteAccess } from '@/lib/api-helpers';

function parseSelectedTypes(raw: FormDataEntryValue | null): BackupDataType[] | undefined {
  if (raw === null || raw === undefined || raw === '') {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    throw new Error('selectedTypes must be a JSON array');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('selectedTypes must be an array');
  }

  const invalid = parsed.filter((type: unknown) => typeof type !== 'string' || !isBackupDataType(type));
  if (invalid.length > 0) {
    throw new Error(`Invalid data types: ${invalid.join(', ')}`);
  }

  const selectedTypes = parsed as BackupDataType[];
  if (selectedTypes.length === 0) {
    throw new Error('Select at least one data type to import');
  }

  return selectedTypes;
}

async function parseImportRequest(request: Request): Promise<{
  backupData: UserBackupData;
  selectedTypes?: BackupDataType[];
}> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new Error('Missing backup file');
    }

    const fileContent = await file.text();
    const validation = validateBackupJsonString(fileContent);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return {
      backupData: validation.backup as UserBackupData,
      selectedTypes: parseSelectedTypes(formData.get('selectedTypes')),
    };
  }

  const bodyText = await request.text();
  if (!bodyText.trim()) {
    throw new Error('Request body is empty');
  }

  let body: { backupData?: UserBackupData; selectedTypes?: BackupDataType[] };
  try {
    body = JSON.parse(bodyText) as { backupData?: UserBackupData; selectedTypes?: BackupDataType[] };
  } catch (error: unknown) {
    const validation = validateBackupJsonString(bodyText);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    return { backupData: validation.backup as UserBackupData };
  }

  const backupCandidate = body.backupData ?? body;
  const validation = validateBackupPayload(backupCandidate);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    backupData: validation.backup as UserBackupData,
    selectedTypes: body.selectedTypes,
  };
}

/**
 * POST /api/backups/import
 * Import account data from an uploaded backup file
 * Account owners and editors can import backups
 */
export async function POST(request: Request) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    await getAuthenticatedUser();

    const { backupData, selectedTypes: rawSelectedTypes } = await parseImportRequest(request);

    let selectedTypes = rawSelectedTypes;
    if (selectedTypes) {
      const validation = validateImportSelection(backupData, selectedTypes);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Backup file is missing required related data for the selected types',
            missingDependencies: validation.missingDependencies,
          },
          { status: 400 }
        );
      }
    }

    await importUserDataFromFile(backupData, selectedTypes ? { selectedTypes } : undefined);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error importing backup:', error);

    if (
      error.message?.includes('Invalid backup') ||
      error.message?.includes('Backup file') ||
      error.message?.includes('Missing backup') ||
      error.message?.includes('selectedTypes') ||
      error.message?.includes('Request body is empty')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (
      error.message?.includes('Unauthorized') ||
      error.message?.includes('permission') ||
      error.message?.includes('read-only') ||
      error.message?.includes('Viewers can only view')
    ) {
      return NextResponse.json(
        { error: 'Unauthorized: Only account owners and editors can import backups.' },
        { status: 403 }
      );
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to import backup' },
      { status: 500 }
    );
  }
}
