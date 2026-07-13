/**
 * Parse Teller API errors into user-friendly messages with suggested actions.
 */

export type TellerErrorAction = 'reconnect';

export interface FormattedTellerError {
  code: string | null;
  message: string;
  action: TellerErrorAction | null;
  actionLabel: string | null;
}

const ERROR_DEFINITIONS: Record<
  string,
  { message: string; action: TellerErrorAction | null; actionLabel: string | null }
> = {
  'enrollment.disconnected': {
    message:
      'Your bank connection was disconnected. This usually happens when you change your bank password or your bank requires you to sign in again.',
    action: 'reconnect',
    actionLabel: 'Reconnect bank account',
  },
  'enrollment.invalid': {
    message:
      'Your bank connection is no longer valid. Reconnect your bank account to resume automatic imports.',
    action: 'reconnect',
    actionLabel: 'Reconnect bank account',
  },
  'enrollment.closed': {
    message:
      'This bank connection was closed. Reconnect your bank account to resume automatic imports.',
    action: 'reconnect',
    actionLabel: 'Reconnect bank account',
  },
};

function extractTellerErrorCode(rawError: string): string | null {
  const jsonMatch = rawError.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const code = parsed?.error?.code;
      if (typeof code === 'string') {
        return code;
      }
    } catch {
      // Fall through to pattern matching
    }
  }

  const codeMatch = rawError.match(/\b(enrollment|account|institution)\.[a-z_]+\b/);
  return codeMatch?.[0] ?? null;
}

function extractTellerErrorMessage(rawError: string): string | null {
  const jsonMatch = rawError.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const message = parsed?.error?.message;
      if (typeof message === 'string') {
        return message;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Convert a raw Teller error string into a user-facing message and optional action.
 */
export function parseTellerError(rawError: string): FormattedTellerError {
  const trimmed = rawError.trim();
  const code = extractTellerErrorCode(trimmed);
  const definition = code ? ERROR_DEFINITIONS[code] : undefined;

  if (definition) {
    return {
      code,
      message: definition.message,
      action: definition.action,
      actionLabel: definition.actionLabel,
    };
  }

  const apiMessage = extractTellerErrorMessage(trimmed);
  if (apiMessage) {
    return {
      code,
      message: apiMessage,
      action: null,
      actionLabel: null,
    };
  }

  // Strip noisy prefixes from stored errors
  const withoutPrefix = trimmed
    .replace(/^Error fetching Teller transactions:\s*/i, '')
    .replace(/^Teller API error:\s*\d+\s*/i, '')
    .trim();

  return {
    code,
    message: withoutPrefix || 'An unexpected error occurred while fetching transactions from your bank.',
    action: null,
    actionLabel: null,
  };
}

/**
 * Format an unknown error for storage and API responses.
 */
export function formatTellerErrorForStorage(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
  return parseTellerError(rawMessage).message;
}

/**
 * Deduplicate error messages while preserving order.
 */
export function dedupeErrors(errors: string[]): string[] {
  return [...new Set(errors.filter(Boolean))];
}
