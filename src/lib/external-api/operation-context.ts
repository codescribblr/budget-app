import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  clearExternalApiOverrides,
  setExternalApiAccountOverride,
  setExternalApiAuthOverride,
} from '@/lib/external-api-overrides';
import type { ExternalApiContext } from './types';

export async function runWithExternalApiContext<T>(
  context: ExternalApiContext,
  fn: () => Promise<T>
): Promise<T> {
  const supabase = createServiceRoleClient();
  setExternalApiAuthOverride(context.createdBy, supabase);
  setExternalApiAccountOverride(context.budgetAccountId);
  try {
    return await fn();
  } finally {
    clearExternalApiOverrides();
  }
}
