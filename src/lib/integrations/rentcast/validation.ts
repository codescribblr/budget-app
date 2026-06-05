import type { NonCashAsset, RentCastPropertyType } from '@/lib/types';
import { RENTCAST_PROPERTY_TYPES } from './types';

export interface RentCastReadinessResult {
  ready: boolean;
  missingFields: string[];
  messages: string[];
}

export function getRentCastRequiredFieldLabels(): string[] {
  return ['Address'];
}

export function validateRentCastAssetReadiness(
  asset: Pick<
    NonCashAsset,
    'asset_type' | 'address' | 'rentcast_enabled'
  >
): RentCastReadinessResult {
  const missingFields: string[] = [];
  const messages: string[] = [];

  if (asset.asset_type !== 'real_estate') {
    return {
      ready: false,
      missingFields: ['Real estate asset type'],
      messages: ['RentCast tracking is only available for real estate assets.'],
    };
  }

  if (!asset.address?.trim()) {
    missingFields.push('Address');
    messages.push('A full property address is required (Street, City, State, Zip).');
  }

  return {
    ready: missingFields.length === 0,
    missingFields,
    messages,
  };
}

export function isRentCastPropertyType(value: string | null | undefined): value is RentCastPropertyType {
  if (!value) return false;
  return (RENTCAST_PROPERTY_TYPES as readonly string[]).includes(value);
}

export function normalizeRentCastAddress(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}
