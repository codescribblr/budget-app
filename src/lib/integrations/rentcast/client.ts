import type {
  RentCastAssetFields,
  RentCastValueEstimateResponse,
} from './types';
import { normalizeRentCastAddress } from './validation';

const RENTCAST_API_BASE = 'https://api.rentcast.io/v1';

export async function fetchRentCastValueEstimate(
  apiKey: string,
  asset: Pick<
    RentCastAssetFields,
    'address' | 'property_type' | 'bedrooms' | 'bathrooms' | 'square_footage'
  >
): Promise<RentCastValueEstimateResponse> {
  if (!asset.address?.trim()) {
    throw new Error('Property address is required for RentCast valuation');
  }

  const params = new URLSearchParams();
  params.set('address', normalizeRentCastAddress(asset.address));
  params.set('lookupSubjectAttributes', 'true');

  if (asset.property_type) {
    params.set('propertyType', asset.property_type);
  }
  if (asset.bedrooms != null) {
    params.set('bedrooms', String(asset.bedrooms));
  }
  if (asset.bathrooms != null) {
    params.set('bathrooms', String(asset.bathrooms));
  }
  if (asset.square_footage != null) {
    params.set('squareFootage', String(asset.square_footage));
  }

  const response = await fetch(`${RENTCAST_API_BASE}/avm/value?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
  });

  const bodyText = await response.text();
  let body: unknown = null;

  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message?: string }).message === 'string'
        ? (body as { message: string }).message
        : `RentCast API request failed (${response.status})`;
    throw new Error(message);
  }

  const data = body as RentCastValueEstimateResponse;
  if (typeof data.price !== 'number' || Number.isNaN(data.price)) {
    throw new Error('RentCast API returned an invalid value estimate');
  }

  return data;
}

export async function testRentCastApiKey(apiKey: string): Promise<void> {
  const params = new URLSearchParams({
    address: '5500 Grand Lake Dr, San Antonio, TX, 78244',
    lookupSubjectAttributes: 'true',
  });

  const response = await fetch(`${RENTCAST_API_BASE}/avm/value?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.message === 'string'
        ? body.message
        : `RentCast API key validation failed (${response.status})`;
    throw new Error(message);
  }
}
