import type { SupabaseClient } from '@supabase/supabase-js';

let authOverride: { userId: string; supabase: SupabaseClient } | null = null;
let accountOverride: number | null = null;

export function setExternalApiAuthOverride(
  userId: string | null,
  supabase: SupabaseClient | null
): void {
  if (userId && supabase) {
    authOverride = { userId, supabase };
  } else {
    authOverride = null;
  }
}

export function getExternalApiAuthOverride(): { userId: string; supabase: SupabaseClient } | null {
  return authOverride;
}

export function setExternalApiAccountOverride(accountId: number | null): void {
  accountOverride = accountId;
}

export function getExternalApiAccountOverride(): number | null {
  return accountOverride;
}

export function clearExternalApiOverrides(): void {
  authOverride = null;
  accountOverride = null;
}
