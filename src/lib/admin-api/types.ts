export type AdminApiAuthMode = 'api_key' | 'session';

export interface AdminApiContext {
  mode: AdminApiAuthMode;
  /** Present when authenticated via admin API key */
  apiKeyId: string | null;
  apiKeyName: string | null;
  /** Present for session auth; also set to key creator is NOT used — keys are shared */
  userId: string | null;
}

export interface AdminApiKeyListItem {
  id: string;
  name: string;
  key_prefix: string;
  created_by: string;
  created_by_email?: string | null;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  previous_key_valid_until: string | null;
  status: 'active' | 'expired' | 'revoked' | 'grace';
}
