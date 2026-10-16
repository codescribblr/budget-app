import { resolveMerchantDisplayName } from '@/lib/merchant-grouping';

/**
 * Attach resolved merchant_name onto transaction row(s) that may include
 * merchant_groups / merchant_override joins.
 */
export function withResolvedMerchantName<T extends Record<string, unknown>>(
  row: T
): T & { merchant_name: string } {
  const description = typeof row.description === 'string' ? row.description : '';
  const override = row.merchant_override as { display_name?: string | null } | null | undefined;
  const groups = row.merchant_groups as
    | {
        display_name?: string | null;
        global_merchants?:
          | { display_name?: string | null; status?: string | null }
          | Array<{ display_name?: string | null; status?: string | null }>
          | null;
      }
    | null
    | undefined;

  let globalName: string | null = null;
  const gm = groups?.global_merchants
    ? Array.isArray(groups.global_merchants)
      ? groups.global_merchants[0]
      : groups.global_merchants
    : null;
  if (gm && gm.status === 'active' && gm.display_name) {
    globalName = gm.display_name;
  }

  const merchant_name = resolveMerchantDisplayName(
    description,
    override?.display_name,
    globalName,
    groups?.display_name
  );

  return { ...row, merchant_name };
}

export const TRANSACTION_MERCHANT_SELECT = `
  *,
  transaction_splits(*),
  merchant_groups (
    display_name,
    global_merchants (
      display_name,
      status
    )
  ),
  merchant_override:global_merchants!merchant_override_id (
    display_name
  )
`;
