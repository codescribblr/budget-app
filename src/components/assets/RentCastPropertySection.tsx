'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn, formatCurrency } from '@/lib/utils';
import { handleApiError } from '@/lib/api-error-handler';
import { toast } from 'sonner';
import type { NonCashAsset, RentCastIntegrationSettingsResponse, RentCastValuationSummary } from '@/lib/types';
import {
  RENTCAST_AFFILIATE_URL,
  RENTCAST_PROMO_CODE,
  RENTCAST_PROMO_DISCOUNT,
  type RentCastValuePreference,
} from '@/lib/integrations/rentcast/types';
import { Check, ExternalLink, Home, RefreshCw } from 'lucide-react';

interface RentCastPropertySectionProps {
  asset: NonCashAsset;
  onAssetUpdated: () => void;
}

interface RentCastResponse {
  asset: {
    rentcast_enabled: boolean;
    rentcast_last_sync_at: string | null;
    rentcast_last_error: string | null;
    rentcast_value_preference: RentCastValuePreference;
    current_value: number;
    property_type: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    square_footage: number | null;
  };
  integration: RentCastIntegrationSettingsResponse | null;
  valuation: RentCastValuationSummary | null;
}

function ValuationChoiceCard({
  label,
  value,
  preference,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  value: number;
  preference: RentCastValuePreference;
  selected: boolean;
  disabled?: boolean;
  onSelect: (preference: RentCastValuePreference) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(preference)}
      className={cn(
        'rounded-md border p-3 text-left transition-colors w-full',
        'hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary bg-primary/10 ring-1 ring-primary/40',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        {selected && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
            <Check className="h-3 w-3" />
            Active
          </span>
        )}
      </div>
      <div className="text-lg font-semibold mt-1">{formatCurrency(value)}</div>
      <div className="text-[11px] text-muted-foreground mt-1">
        {selected ? 'Used as property value' : 'Click to use as property value'}
      </div>
    </button>
  );
}

export default function RentCastPropertySection({ asset, onAssetUpdated }: RentCastPropertySectionProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [data, setData] = useState<RentCastResponse | null>(null);

  const fetchRentCastData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/non-cash-assets/${asset.id}/rentcast`);
      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to load RentCast data');
        throw new Error(message || 'Failed to load RentCast data');
      }
      setData(await response.json());
    } catch (error: any) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (asset.asset_type === 'real_estate') {
      fetchRentCastData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, asset.asset_type, asset.rentcast_enabled, asset.rentcast_last_sync_at, asset.current_value]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/non-cash-assets/${asset.id}/rentcast/sync`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to sync RentCast value');
      }

      toast.success('RentCast value updated');
      await fetchRentCastData();
      onAssetUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync RentCast value');
      await fetchRentCastData();
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectValue = async (preference: RentCastValuePreference) => {
    if (!data?.valuation || selecting) return;
    if ((data.asset.rentcast_value_preference || 'estimate') === preference) return;

    setSelecting(true);
    try {
      const response = await fetch(`/api/non-cash-assets/${asset.id}/rentcast/select-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update property value');
      }
      toast.success(`Property value set to RentCast ${preference}`);
      await fetchRentCastData();
      onAssetUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update property value');
    } finally {
      setSelecting(false);
    }
  };

  if (asset.asset_type !== 'real_estate') {
    return null;
  }

  const integrationEnabled = data?.integration?.is_enabled ?? false;
  const trackingEnabled = asset.rentcast_enabled ?? false;
  const valuation = data?.valuation;
  const activePreference = data?.asset.rentcast_value_preference ?? 'estimate';
  const subject = valuation?.subject_property as Record<string, unknown> | null | undefined;
  const comparables = (valuation?.comparables as Record<string, unknown>[] | null | undefined) ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              RentCast Valuation
            </CardTitle>
            <CardDescription>
              Automated property value estimates from RentCast.io using your own API key.
              Click a value below to use it as this property&apos;s stored value.
            </CardDescription>
          </div>
          {trackingEnabled && integrationEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || selecting || data?.integration?.monthly_limit_reached}
            >
              {syncing ? <LoadingSpinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync Now
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner className="h-4 w-4" />
            Loading RentCast data...
          </div>
        ) : !integrationEnabled ? (
          <Alert>
            <AlertDescription>
              RentCast is not enabled for this account. The account owner can add an API key in{' '}
              <Link href="/settings/integrations" className="font-medium underline">
                Settings → Integrations
              </Link>
              . Don&apos;t have a RentCast account?{' '}
              <a
                href={RENTCAST_AFFILIATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Sign up
              </a>{' '}
              and use code{' '}
              <span className="font-mono">{RENTCAST_PROMO_CODE}</span> for {RENTCAST_PROMO_DISCOUNT}.
            </AlertDescription>
          </Alert>
        ) : !trackingEnabled ? (
          <Alert>
            <AlertDescription>
              RentCast tracking is off for this property. Edit the asset to enable it once the address is filled in.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Tracking enabled</Badge>
              {data?.integration?.monthly_limit_reached && (
                <Badge variant="destructive">Monthly limit reached</Badge>
              )}
              {asset.rentcast_last_sync_at && (
                <Badge variant="secondary">
                  Last synced {new Date(asset.rentcast_last_sync_at).toLocaleString()}
                </Badge>
              )}
            </div>

            {asset.rentcast_last_error && (
              <Alert variant="destructive">
                <AlertDescription>{asset.rentcast_last_error}</AlertDescription>
              </Alert>
            )}

            {data?.integration && (
              <p className="text-xs text-muted-foreground">
                API usage: {data.integration.requests_this_month} / {data.integration.config.monthly_request_limit} requests this month
              </p>
            )}

            {valuation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ValuationChoiceCard
                    label="Estimated Value"
                    value={valuation.estimated_value}
                    preference="estimate"
                    selected={activePreference === 'estimate'}
                    disabled={selecting || syncing}
                    onSelect={handleSelectValue}
                  />
                  {valuation.price_range_low != null && (
                    <ValuationChoiceCard
                      label="Low Range"
                      value={valuation.price_range_low}
                      preference="low"
                      selected={activePreference === 'low'}
                      disabled={selecting || syncing}
                      onSelect={handleSelectValue}
                    />
                  )}
                  {valuation.price_range_high != null && (
                    <ValuationChoiceCard
                      label="High Range"
                      value={valuation.price_range_high}
                      preference="high"
                      selected={activePreference === 'high'}
                      disabled={selecting || syncing}
                      onSelect={handleSelectValue}
                    />
                  )}
                </div>

                {subject && (
                  <div className="rounded-md border p-4 space-y-3">
                    <h4 className="font-medium">Subject Property</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {typeof subject.formattedAddress === 'string' && (
                        <div>
                          <div className="text-xs text-muted-foreground">Address</div>
                          <div>{subject.formattedAddress}</div>
                        </div>
                      )}
                      {typeof subject.propertyType === 'string' && (
                        <div>
                          <div className="text-xs text-muted-foreground">Property Type</div>
                          <div>{subject.propertyType}</div>
                        </div>
                      )}
                      {subject.bedrooms != null && (
                        <div>
                          <div className="text-xs text-muted-foreground">Bedrooms</div>
                          <div>{String(subject.bedrooms)}</div>
                        </div>
                      )}
                      {subject.bathrooms != null && (
                        <div>
                          <div className="text-xs text-muted-foreground">Bathrooms</div>
                          <div>{String(subject.bathrooms)}</div>
                        </div>
                      )}
                      {subject.squareFootage != null && (
                        <div>
                          <div className="text-xs text-muted-foreground">Square Footage</div>
                          <div>{Number(subject.squareFootage).toLocaleString()} sq ft</div>
                        </div>
                      )}
                      {subject.lotSize != null && (
                        <div>
                          <div className="text-xs text-muted-foreground">Lot Size</div>
                          <div>{Number(subject.lotSize).toLocaleString()} sq ft</div>
                        </div>
                      )}
                      {subject.yearBuilt != null && (
                        <div>
                          <div className="text-xs text-muted-foreground">Year Built</div>
                          <div>{String(subject.yearBuilt)}</div>
                        </div>
                      )}
                      {subject.lastSalePrice != null && (
                        <div>
                          <div className="text-xs text-muted-foreground">Last Sale Price</div>
                          <div>{formatCurrency(Number(subject.lastSalePrice))}</div>
                        </div>
                      )}
                      {typeof subject.lastSaleDate === 'string' && (
                        <div>
                          <div className="text-xs text-muted-foreground">Last Sale Date</div>
                          <div>{new Date(subject.lastSaleDate).toLocaleDateString()}</div>
                        </div>
                      )}
                      {typeof subject.county === 'string' && (
                        <div>
                          <div className="text-xs text-muted-foreground">County</div>
                          <div>{subject.county}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {comparables.length > 0 && (
                  <div className="rounded-md border p-4 space-y-3">
                    <h4 className="font-medium">Comparable Sales ({Math.min(comparables.length, 5)} shown)</h4>
                    <div className="space-y-3">
                      {comparables.slice(0, 5).map((comp, index) => (
                        <div key={String(comp.id ?? index)} className="rounded-md border p-3 text-sm">
                          <div className="font-medium">{String(comp.formattedAddress ?? 'Comparable property')}</div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                            {comp.price != null && <span>Price: {formatCurrency(Number(comp.price))}</span>}
                            {comp.bedrooms != null && <span>Beds: {String(comp.bedrooms)}</span>}
                            {comp.bathrooms != null && <span>Baths: {String(comp.bathrooms)}</span>}
                            {comp.squareFootage != null && <span>{Number(comp.squareFootage).toLocaleString()} sq ft</span>}
                            {comp.distance != null && <span>{Number(comp.distance).toFixed(2)} mi away</span>}
                            {comp.correlation != null && <span>Correlation: {Number(comp.correlation).toFixed(2)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Valuation fetched {new Date(valuation.fetched_at).toLocaleString()} from RentCast.io
                </p>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No RentCast valuation yet. Use Sync Now to fetch the current estimate.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <a
          href="https://developers.rentcast.io/reference/value-estimate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Learn more about RentCast valuations
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
