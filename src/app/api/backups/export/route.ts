import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { exportAccountData, isBackupDataType } from '@/lib/backup-utils';
import type { BackupDataType } from '@/lib/backup-utils';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/backups/export
 * Export account data as JSON with optional data type selection.
 */
export async function POST(request: Request) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    await getAuthenticatedUser();

    let selectedTypes: BackupDataType[] | undefined;
    try {
      const body = await request.json();
      if (body?.selectedTypes) {
        if (!Array.isArray(body.selectedTypes)) {
          return NextResponse.json(
            { error: 'selectedTypes must be an array' },
            { status: 400 }
          );
        }
        const invalid = body.selectedTypes.filter(
          (type: string) => !isBackupDataType(type)
        );
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: `Invalid data types: ${invalid.join(', ')}` },
            { status: 400 }
          );
        }
        selectedTypes = body.selectedTypes;
      }
    } catch {
      // Empty body is fine — full export
    }

    if (selectedTypes && selectedTypes.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one data type to export' },
        { status: 400 }
      );
    }

    const backupData = await exportAccountData(
      selectedTypes ? { selectedTypes } : undefined
    );

    return NextResponse.json(backupData);
  } catch (error: unknown) {
    console.error('Error exporting backup:', error);
    const message = error instanceof Error ? error.message : 'Failed to export backup';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
