'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { useFeatures } from '@/contexts/FeatureContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  DASHBOARD_CARD_OPTIONS,
  DASHBOARD_CARD_VISIBILITY_KEY,
  DEFAULT_DASHBOARD_CARD_VISIBILITY,
  parseDashboardCardVisibility,
  serializeDashboardCardVisibility,
  type DashboardCardId,
  type DashboardCardVisibility,
} from '@/lib/dashboard-card-visibility';
import type { FeatureName } from '@/lib/feature-flags';
import { Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardSettingsForm() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const { isFeatureEnabled, features, loading: featuresLoading } = useFeatures();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const [visibility, setVisibility] = useState<DashboardCardVisibility>(DEFAULT_DASHBOARD_CARD_VISIBILITY);
  const [loading, setLoading] = useState(true);

  const accessLoading = featuresLoading || subscriptionLoading;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = (await res.json()) as Record<string, string>;
      const raw = data[DASHBOARD_CARD_VISIBILITY_KEY];
      setVisibility(parseDashboardCardVisibility(raw));
    } catch {
      toast.error('Could not load dashboard layout');
      setVisibility({ ...DEFAULT_DASHBOARD_CARD_VISIBILITY });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: DashboardCardVisibility) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            {
              key: DASHBOARD_CARD_VISIBILITY_KEY,
              value: serializeDashboardCardVisibility(next),
            },
          ],
        }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('You do not have permission to change settings.');
          return;
        }
        throw new Error('Save failed');
      }
      setVisibility(next);
    } catch {
      toast.error('Could not save dashboard layout');
    }
  };

  const handleToggle = (id: DashboardCardId, checked: boolean) => {
    if (!isEditor) return;
    const next = { ...visibility, [id]: checked };
    void persist(next);
  };

  const featureDisplayName = (key: FeatureName) =>
    features.find((f) => f.key === key)?.name ?? key.replace(/_/g, ' ');

  if (loading || permissionsLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Dashboard layout</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which cards appear on your main dashboard. Budget categories are always shown. Optional features may
          need to be turned on in Features; some of those also require Premium before you can show or hide their card.
        </p>
        {!isEditor && (
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-2">
            Only editors and owners can change visibility toggles.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard cards</CardTitle>
          <CardDescription>
            Every block from your main dashboard is listed here. Core sections only need a show/hide toggle. For other
            cards, turn the feature on when needed; if a feature is Premium-only, upgrade first, then you can enable it
            and choose visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DASHBOARD_CARD_OPTIONS.map((opt) => {
            const featureKey = opt.requiresPremiumFeature;
            if (!featureKey) {
              return (
                <div
                  key={opt.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="text-base font-medium">{opt.title}</div>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-end sm:pl-4">
                    <div className="flex flex-col items-end gap-1">
                      <Label htmlFor={`dash-card-${opt.id}`} className="sr-only">
                        Show {opt.title} on dashboard
                      </Label>
                      <Switch
                        id={`dash-card-${opt.id}`}
                        checked={visibility[opt.id]}
                        onCheckedChange={(checked) => handleToggle(opt.id, checked)}
                        disabled={!isEditor}
                      />
                    </div>
                  </div>
                </div>
              );
            }

            const featureDef = features.find((f) => f.key === featureKey);
            const requiresPaidTier = featureDef?.requiresPremium === true;
            const featureOn = isFeatureEnabled(featureKey);
            const showUpgrade = !accessLoading && requiresPaidTier && !isPremium;
            const showEnable =
              !accessLoading && !showUpgrade && !featureOn && (!requiresPaidTier || isPremium);
            const showToggle = !accessLoading && !showUpgrade && !showEnable;

            return (
              <div
                key={opt.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="text-base font-medium">{opt.title}</div>
                  <p className="text-sm text-muted-foreground">{opt.description}</p>
                  {showUpgrade ? (
                    <p className="text-xs text-muted-foreground">Requires a Premium subscription.</p>
                  ) : null}
                  {showEnable ? (
                    <p className="text-xs text-muted-foreground">
                      Enable <span className="font-medium text-foreground">{featureDisplayName(featureKey)}</span> in
                      Features to use this card on the dashboard.
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-end sm:pl-4">
                  {accessLoading ? (
                    <Skeleton className="h-9 w-[8.5rem] rounded-md" />
                  ) : showUpgrade ? (
                    <Button
                      size="sm"
                      asChild
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                    >
                      <Link href="/settings/subscription">
                        <Crown className="mr-2 h-4 w-4" aria-hidden />
                        Upgrade to Premium
                      </Link>
                    </Button>
                  ) : showEnable ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        href="/settings/features"
                        title={`Enable ${featureDisplayName(featureKey)}`}
                      >
                        Enable this feature
                      </Link>
                    </Button>
                  ) : showToggle ? (
                    <div className="flex flex-col items-end gap-1">
                      <Label htmlFor={`dash-card-${opt.id}`} className="sr-only">
                        Show {opt.title} on dashboard
                      </Label>
                      <Switch
                        id={`dash-card-${opt.id}`}
                        checked={visibility[opt.id]}
                        onCheckedChange={(checked) => handleToggle(opt.id, checked)}
                        disabled={!isEditor}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
