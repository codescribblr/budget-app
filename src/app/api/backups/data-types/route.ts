import { NextResponse } from 'next/server';
import { listBackupDataTypesForApi } from '@/lib/backup-utils';

/**
 * GET /api/backups/data-types
 * List exportable backup data types with labels and dependency info.
 */
export async function GET() {
  return NextResponse.json({
    dataTypes: listBackupDataTypesForApi(),
  });
}
