import type { ApiScope, ApiScopeAccess, ApiScopeSection } from './types';

export const API_SCOPE_SECTIONS: Array<{
  section: ApiScopeSection;
  label: string;
  description: string;
}> = [
  { section: 'transactions', label: 'Transactions', description: 'Transactions, splits, and search' },
  { section: 'recurring_transactions', label: 'Recurring Transactions', description: 'Recurring rules and matches' },
  { section: 'categories', label: 'Categories', description: 'Budget categories and funding' },
  { section: 'accounts', label: 'Cash Accounts', description: 'Checking, savings, and cash accounts' },
  { section: 'credit_cards', label: 'Credit Cards', description: 'Credit cards and balances' },
  { section: 'loans', label: 'Loans', description: 'Loans and mortgages' },
  { section: 'non_cash_assets', label: 'Non-cash Assets', description: 'Investments, retirement, and other assets' },
  { section: 'pending_checks', label: 'Pending Checks', description: 'Outstanding checks' },
  { section: 'goals', label: 'Goals', description: 'Savings and debt payoff goals' },
  { section: 'income', label: 'Income', description: 'Income settings, streams, and deductions' },
  { section: 'income_buffer', label: 'Income Buffer', description: 'Income buffer operations' },
  { section: 'imports', label: 'Imports', description: 'CSV import, queue, templates, and automatic imports' },
  { section: 'merchants', label: 'Merchants', description: 'Merchant groups, mappings, and category rules' },
  { section: 'tags', label: 'Tags', description: 'Tags and tag rules' },
  { section: 'reports', label: 'Reports', description: 'Read-only reports and summaries' },
  { section: 'notifications', label: 'Notifications', description: 'Notification preferences and history' },
  { section: 'settings', label: 'Settings', description: 'Account settings and dashboard layout' },
  { section: 'collaborators', label: 'Collaborators', description: 'Team members and invitations' },
  { section: 'backup', label: 'Backup', description: 'Create, export, restore, and delete backups' },
];

export const ALL_API_SCOPES: ApiScope[] = API_SCOPE_SECTIONS.flatMap(({ section }) => [
  `${section}:read` as ApiScope,
  `${section}:write` as ApiScope,
]);

export const API_SCOPE_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  permissions: ApiScope[];
}> = [
  {
    id: 'read_only_assistant',
    name: 'Read-only assistant',
    description: 'Read access to core budget data (no backup, collaborators, or settings)',
    permissions: ALL_API_SCOPES.filter(
      (scope) =>
        scope.endsWith(':read') &&
        !scope.startsWith('backup:') &&
        !scope.startsWith('collaborators:') &&
        !scope.startsWith('settings:')
    ),
  },
  {
    id: 'transaction_manager',
    name: 'Transaction manager',
    description: 'Read/write transactions with read access to related data',
    permissions: [
      'transactions:read',
      'transactions:write',
      'categories:read',
      'accounts:read',
      'credit_cards:read',
      'tags:read',
      'merchants:read',
    ],
  },
  {
    id: 'full_read',
    name: 'Full read',
    description: 'Read access to all sections',
    permissions: ALL_API_SCOPES.filter((scope) => scope.endsWith(':read')),
  },
  {
    id: 'full_access',
    name: 'Full access',
    description: 'Read and write access to all sections',
    permissions: [...ALL_API_SCOPES],
  },
];

export function isValidApiScope(value: string): value is ApiScope {
  const [section, access] = value.split(':') as [ApiScopeSection, ApiScopeAccess];
  if (!section || !access) return false;
  if (access !== 'read' && access !== 'write') return false;
  return API_SCOPE_SECTIONS.some((item) => item.section === section);
}

export function normalizePermissions(permissions: string[]): ApiScope[] {
  const normalized = new Set<ApiScope>();

  for (const permission of permissions) {
    if (!isValidApiScope(permission)) {
      throw new Error(`Invalid permission scope: ${permission}`);
    }
    normalized.add(permission);
    if (permission.endsWith(':write')) {
      const readScope = permission.replace(':write', ':read') as ApiScope;
      normalized.add(readScope);
    }
  }

  return Array.from(normalized);
}

export function hasScope(permissions: ApiScope[], section: ApiScopeSection, access: ApiScopeAccess): boolean {
  const scope = `${section}:${access}` as ApiScope;
  return permissions.includes(scope);
}

export function scopeForMethod(method: string, section: ApiScopeSection): ApiScope {
  const access: ApiScopeAccess =
    method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? 'read' : 'write';
  return `${section}:${access}`;
}

export function requireScope(
  permissions: ApiScope[],
  section: ApiScopeSection,
  method: string
): ApiScope {
  const required = scopeForMethod(method, section);
  if (!permissions.includes(required)) {
    throw new InsufficientScopeError(required);
  }
  return required;
}

export class InsufficientScopeError extends Error {
  readonly requiredScope: ApiScope;

  constructor(requiredScope: ApiScope) {
    super(`This API key lacks the required scope: ${requiredScope}`);
    this.name = 'InsufficientScopeError';
    this.requiredScope = requiredScope;
  }
}

export class InvalidApiKeyError extends Error {
  constructor(message = 'Invalid or revoked API key') {
    super(message);
    this.name = 'InvalidApiKeyError';
  }
}

export function getApiKeyPrefix(): 'bud_live_' | 'bud_test_' {
  return process.env.NODE_ENV === 'production' ? 'bud_live_' : 'bud_test_';
}
