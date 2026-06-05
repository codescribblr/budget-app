import type { NonCashAsset } from '@/lib/types';

export const NON_CASH_ASSET_TYPE_OPTIONS: {
  value: NonCashAsset['asset_type'];
  label: string;
}[] = [
  { value: 'investment', label: 'Investment' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'art', label: 'Art' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'cryptocurrency', label: 'Cryptocurrency' },
  { value: 'other', label: 'Other' },
];

export function getAssetTypeLabel(assetType: NonCashAsset['asset_type']): string {
  return (
    NON_CASH_ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ??
    assetType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function filterAssetsByType(
  assets: NonCashAsset[],
  selectedTypes: NonCashAsset['asset_type'][]
): NonCashAsset[] {
  if (selectedTypes.length === 0) return assets;
  return assets.filter((asset) => selectedTypes.includes(asset.asset_type));
}
