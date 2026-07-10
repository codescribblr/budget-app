export const RENTCAST_PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Manufactured',
  'Multi-Family',
  'Apartment',
  'Land',
] as const;

export type RentCastPropertyType = (typeof RENTCAST_PROPERTY_TYPES)[number];

export const DEFAULT_RENTCAST_MONTHLY_LIMIT = 50;

export const RENTCAST_AFFILIATE_URL = 'https://rentcast.io?via=everydollarbudgetapp';
export const RENTCAST_PROMO_CODE = 'BIGDEAL';
export const RENTCAST_PROMO_DISCOUNT = '20% off';

export interface RentCastIntegrationConfig {
  enforce_monthly_limit: boolean;
  monthly_request_limit: number;
}

export interface RentCastIntegrationSettings {
  id: number;
  account_id: number;
  integration_type: 'rentcast';
  is_enabled: boolean;
  has_api_key: boolean;
  api_key_hint: string | null;
  config: RentCastIntegrationConfig;
  requests_this_month: number;
  usage_month: string | null;
  monthly_limit_reached: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentCastSubjectProperty {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
}

export interface RentCastComparable {
  id?: string;
  formattedAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  status?: string;
  price?: number;
  listedDate?: string;
  removedDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
  distance?: number;
  correlation?: number;
}

export interface RentCastValueEstimateResponse {
  price: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  subjectProperty?: RentCastSubjectProperty;
  comparables?: RentCastComparable[];
}

export interface RentCastValuationRecord {
  id: number;
  asset_id: number;
  account_id: number;
  estimated_value: number;
  price_range_low: number | null;
  price_range_high: number | null;
  subject_property: RentCastSubjectProperty | null;
  comparables: RentCastComparable[] | null;
  fetched_at: string;
  created_at: string;
}

export type RentCastValuePreference = 'estimate' | 'low' | 'high';

export const RENTCAST_VALUE_PREFERENCES = ['estimate', 'low', 'high'] as const;

export interface RentCastAssetFields {
  id: number;
  account_id: number;
  name: string;
  asset_type: 'real_estate';
  address: string | null;
  current_value: number;
  rentcast_enabled: boolean;
  property_type: RentCastPropertyType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  rentcast_last_sync_at: string | null;
  rentcast_last_error: string | null;
  rentcast_value_preference?: RentCastValuePreference | null;
}

export interface RentCastSyncResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  estimatedValue?: number;
  oldValue?: number;
  newValue?: number;
}

export class RentCastRateLimitError extends Error {
  constructor(message = 'Monthly RentCast API request limit reached') {
    super(message);
    this.name = 'RentCastRateLimitError';
  }
}

export class RentCastIntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RentCastIntegrationError';
  }
}
