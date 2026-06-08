export type ApiScopeAccess = 'read' | 'write';

export type ApiScopeSection =
  | 'transactions'
  | 'recurring_transactions'
  | 'categories'
  | 'accounts'
  | 'credit_cards'
  | 'loans'
  | 'non_cash_assets'
  | 'pending_checks'
  | 'goals'
  | 'income'
  | 'income_buffer'
  | 'imports'
  | 'merchants'
  | 'tags'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'collaborators'
  | 'backup';

export type ApiScope = `${ApiScopeSection}:${ApiScopeAccess}`;

export interface ApiKeyRecord {
  id: string;
  budget_account_id: number;
  created_by: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permissions: ApiScope[];
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  key_prefix: string;
  permissions: ApiScope[];
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ExternalApiContext {
  apiKeyId: string;
  budgetAccountId: number;
  createdBy: string;
  permissions: ApiScope[];
  keyName: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: ApiScope[];
  expires_at?: string | null;
}

export interface CreateApiKeyResponse {
  key: ApiKeyListItem;
  secret: string;
}
