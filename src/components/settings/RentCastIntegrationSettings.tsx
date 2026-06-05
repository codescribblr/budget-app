'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { Loader2, ExternalLink, Home, Trash2 } from 'lucide-react';
import type { RentCastIntegrationSettingsResponse } from '@/lib/types';
import { DEFAULT_RENTCAST_MONTHLY_LIMIT, RENTCAST_AFFILIATE_URL, RENTCAST_PROMO_CODE, RENTCAST_PROMO_DISCOUNT } from '@/lib/integrations/rentcast/types';

export default function RentCastIntegrationSettings() {
  const [integration, setIntegration] = useState<RentCastIntegrationSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [enforceLimit, setEnforceLimit] = useState(true);
  const [monthlyLimit, setMonthlyLimit] = useState(String(DEFAULT_RENTCAST_MONTHLY_LIMIT));

  const fetchingRef = useRef(false);

  const fetchIntegration = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/settings/integrations/rentcast');
      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to load RentCast integration');
        throw new Error(message || 'Failed to load RentCast integration');
      }

      const data = await response.json();
      const nextIntegration = data.integration as RentCastIntegrationSettingsResponse;
      setIntegration(nextIntegration);
      setIsEnabled(nextIntegration.is_enabled);
      setEnforceLimit(nextIntegration.config.enforce_monthly_limit);
      setMonthlyLimit(String(nextIntegration.config.monthly_request_limit));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to load RentCast integration');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchIntegration();
  }, []);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Enter an API key to test');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/settings/integrations/rentcast/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });

      if (!response.ok) {
        const message = await handleApiError(response, 'API key test failed');
        throw new Error(message || 'API key test failed');
      }

      toast.success('RentCast API key is valid');
    } catch (error: any) {
      toast.error(error.message || 'API key test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (isEnabled && !integration?.has_api_key && !apiKey.trim()) {
      toast.error('Enter your RentCast API key before enabling the integration');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        is_enabled: isEnabled,
        config: {
          enforce_monthly_limit: enforceLimit,
          monthly_request_limit: parseInt(monthlyLimit, 10) || DEFAULT_RENTCAST_MONTHLY_LIMIT,
        },
      };

      if (apiKey.trim()) {
        payload.api_key = apiKey.trim();
      }

      const response = await fetch('/api/settings/integrations/rentcast', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to save RentCast integration');
        throw new Error(message || 'Failed to save RentCast integration');
      }

      const data = await response.json();
      setIntegration(data.integration);
      setApiKey('');
      toast.success('RentCast integration saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save RentCast integration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const response = await fetch('/api/settings/integrations/rentcast', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to remove RentCast integration');
        throw new Error(message || 'Failed to remove RentCast integration');
      }

      setIntegration(null);
      setApiKey('');
      setIsEnabled(false);
      setEnforceLimit(true);
      setMonthlyLimit(String(DEFAULT_RENTCAST_MONTHLY_LIMIT));
      toast.success('RentCast integration removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove RentCast integration');
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading RentCast integration...
      </div>
    );
  }

  const usageLabel = integration
    ? `${integration.requests_this_month} / ${integration.config.monthly_request_limit} requests this month`
    : `0 / ${DEFAULT_RENTCAST_MONTHLY_LIMIT} requests this month`;

  return (
    <div className="space-y-6 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <h3 className="font-semibold">RentCast.io</h3>
            {integration?.is_enabled ? (
              <Badge variant="default">Enabled</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
            {integration?.monthly_limit_reached && (
              <Badge variant="destructive">Limit reached</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically update real estate asset values using your own RentCast API key.
          </p>
          <div className="space-y-1">
            <a
              href={RENTCAST_AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Sign up for RentCast.io
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-xs text-muted-foreground">
              Get {RENTCAST_PROMO_DISCOUNT} your subscription with code{' '}
              <span className="font-mono font-medium text-foreground">{RENTCAST_PROMO_CODE}</span>, then
              copy your API key from your RentCast dashboard.
            </p>
          </div>
        </div>
      </div>

      {integration?.monthly_limit_reached && (
        <Alert variant="destructive">
          <AlertDescription>
            You&apos;ve reached your monthly RentCast request limit. Automatic and manual syncs are paused until next month or until you disable the limiter.
          </AlertDescription>
        </Alert>
      )}

      {integration?.last_error && (
        <Alert>
          <AlertDescription>Last sync error: {integration.last_error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">API usage</div>
          <div className="mt-1 font-medium">{usageLabel}</div>
          {integration?.usage_month && (
            <div className="text-xs text-muted-foreground mt-1">
              Tracking month: {integration.usage_month}
            </div>
          )}
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Last sync</div>
          <div className="mt-1 font-medium">
            {integration?.last_sync_at
              ? new Date(integration.last_sync_at).toLocaleString()
              : 'Never'}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rentcast-api-key">API Key</Label>
          <Input
            id="rentcast-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={integration?.has_api_key ? `Saved key ending in ${integration.api_key_hint}` : 'Enter your RentCast API key'}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleTestKey} disabled={isTesting || !apiKey.trim()}>
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Key'}
            </Button>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="rentcast-enabled"
            checked={isEnabled}
            onCheckedChange={(checked) => setIsEnabled(checked === true)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="rentcast-enabled" className="cursor-pointer">
              Enable RentCast integration
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, you can turn on RentCast tracking for individual real estate assets.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="rentcast-enforce-limit"
              checked={enforceLimit}
              onCheckedChange={(checked) => setEnforceLimit(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="rentcast-enforce-limit" className="cursor-pointer">
                Enforce monthly request limit
              </Label>
              <p className="text-xs text-muted-foreground">
                Recommended for the free RentCast tier (50 requests/month). Syncs stop once the limit is reached.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="rentcast-monthly-limit">Monthly request limit</Label>
            <Input
              id="rentcast-monthly-limit"
              type="number"
              min={1}
              max={1000}
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              disabled={!enforceLimit}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Integration
        </Button>
        {(integration?.has_api_key || integration?.is_enabled) && (
          <Button variant="outline" onClick={handleRemove} disabled={isRemoving}>
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
