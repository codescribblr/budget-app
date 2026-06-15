import type { BackupPayload } from './backup-data-types';

export interface BackupValidationSuccess {
  valid: true;
  backup: BackupPayload;
}

export interface BackupValidationFailure {
  valid: false;
  error: string;
}

export type BackupValidationResult = BackupValidationSuccess | BackupValidationFailure;

const TRUNCATION_HINT_BYTES = 9_500_000;

function truncateErrorMessage(message: string, maxLength = 200): string {
  return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message;
}

/** Validate parsed backup object structure. */
export function validateBackupPayload(data: unknown): BackupValidationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Backup must be a JSON object' };
  }

  const backup = data as BackupPayload;

  if (typeof backup.version !== 'string' || !backup.version.trim()) {
    return { valid: false, error: 'Backup is missing a version field' };
  }

  if (typeof backup.created_at !== 'string' || !backup.created_at.trim()) {
    return { valid: false, error: 'Backup is missing a created_at field' };
  }

  if (backup.version.startsWith('2') && !(backup as Record<string, unknown>).account) {
    return { valid: false, error: 'Backup is missing account metadata' };
  }

  try {
    JSON.stringify(backup);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown serialization error';
    return {
      valid: false,
      error: `Backup contains data that cannot be serialized to JSON: ${truncateErrorMessage(message)}`,
    };
  }

  return { valid: true, backup };
}

/** Parse and validate backup JSON text (for imports and export verification). */
export function validateBackupJsonString(json: string): BackupValidationResult {
  if (!json.trim()) {
    return { valid: false, error: 'Backup file is empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    if (json.length >= TRUNCATION_HINT_BYTES && message.includes('Unterminated')) {
      return {
        valid: false,
        error:
          'Backup file appears truncated (incomplete JSON). The upload may have exceeded the server size limit — try again after increasing the limit or use a smaller partial backup.',
      };
    }
    return { valid: false, error: `Invalid backup JSON: ${truncateErrorMessage(message)}` };
  }

  return validateBackupPayload(parsed);
}

/** Verify backup survives compress/decompress round-trip before persisting. */
export async function validateBackupForStorage<T extends BackupPayload>(
  backupData: T,
  compress: (data: T) => Promise<Buffer>,
  decompress: (data: Buffer) => Promise<T>
): Promise<BackupValidationResult> {
  const initial = validateBackupPayload(backupData);
  if (!initial.valid) {
    return initial;
  }

  try {
    const compressed = await compress(backupData);
    const restored = await decompress(compressed);
    return validateBackupPayload(restored);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Backup failed compress/decompress validation: ${truncateErrorMessage(message)}`,
    };
  }
}
