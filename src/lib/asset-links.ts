export interface AssetLinkIncomeStream {
  id: number;
  name: string;
}

export interface AssetLinkLoan {
  id: number;
  name: string;
}

export interface AssetLinks {
  incomeStream?: AssetLinkIncomeStream;
  loan?: AssetLinkLoan;
}

export interface LinkedIncomeStreamRow {
  id: number;
  name: string;
  linked_non_cash_asset_id?: number | null;
}

export interface LinkedLoanRow {
  id: number;
  name: string;
  linked_non_cash_asset_id?: number | null;
}

export function buildAssetLinksMap(
  incomeStreams: LinkedIncomeStreamRow[],
  loans: LinkedLoanRow[]
): Map<number, AssetLinks> {
  const map = new Map<number, AssetLinks>();

  for (const stream of incomeStreams) {
    if (stream.linked_non_cash_asset_id == null) continue;
    const existing = map.get(stream.linked_non_cash_asset_id) ?? {};
    map.set(stream.linked_non_cash_asset_id, {
      ...existing,
      incomeStream: { id: stream.id, name: stream.name },
    });
  }

  for (const loan of loans) {
    if (loan.linked_non_cash_asset_id == null) continue;
    const existing = map.get(loan.linked_non_cash_asset_id) ?? {};
    map.set(loan.linked_non_cash_asset_id, {
      ...existing,
      loan: { id: loan.id, name: loan.name },
    });
  }

  return map;
}

export function assetHasAnyLink(
  asset: { rentcast_enabled?: boolean | null },
  links?: AssetLinks
): boolean {
  return Boolean(links?.incomeStream || links?.loan || asset.rentcast_enabled);
}
