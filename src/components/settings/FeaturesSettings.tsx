'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Info, AlertTriangle, Loader2, Crown } from 'lucide-react';
import { useFeatures, type Feature } from '@/contexts/FeatureContext';
import { toast } from 'sonner';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { HelpPanel, HelpSection } from '@/components/ui/help-panel';
import { HELP_CONTENT } from '@/lib/help-content';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LEVEL_COLORS = {
  basic: 'bg-green-500/10 text-green-700 dark:text-green-400',
  intermediate: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  advanced: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  power: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
};

const LEVEL_LABELS = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  power: 'Power User',
};

export default function FeaturesSettings() {
  const router = useRouter();
  const { features, loading, hasPremium, toggleFeature, refreshFeatures } = useFeatures();
  const { isOwner, isLoading: permissionsLoading } = useAccountPermissions();
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    feature: Feature | null;
    action: 'enable' | 'disable';
  }>({ open: false, feature: null, action: 'enable' });
  
  // Check if user has premium but features aren't enabled
  const premiumFeaturesNotEnabled = hasPremium && features.some(
    f => f.requiresPremium && !f.enabled
  );

  const handleToggle = async (feature: Feature, enabled: boolean) => {
    // Check if premium required and user doesn't have premium
    if (enabled && feature.requiresPremium && !hasPremium) {
      router.push('/settings/subscription');
      return;
    }

    // Show confirmation for features with data loss warning
    if (feature.dataLossWarning && !enabled) {
      setConfirmDialog({ open: true, feature, action: 'disable' });
      return;
    }

    await performToggle(feature, enabled);
  };

  const performToggle = async (feature: Feature, enabled: boolean) => {
    setTogglingFeature(feature.key);
    try {
      await toggleFeature(feature.key, enabled);
      toast.success(
        enabled
          ? `${feature.name} enabled successfully`
          : `${feature.name} disabled successfully`
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle feature', {
        duration: 8000, // 8 seconds for error messages (default is 4 seconds)
      });
    } finally {
      setTogglingFeature(null);
      setConfirmDialog({ open: false, feature: null, action: 'enable' });
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.level]) {
      acc[feature.level] = [];
    }
    acc[feature.level].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Features
          </CardTitle>
          <CardDescription>
            Enable advanced features to customize your budgeting experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Features
          </CardTitle>
          <CardDescription>
            Enable advanced features to customize your budgeting experience. Features are organized by complexity level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show button to enable premium features if user has premium but features aren't enabled */}
          {hasPremium && isOwner && !loading && premiumFeaturesNotEnabled && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Premium features not enabled
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You have a premium subscription, but some premium features haven't been enabled yet. Click below to enable all premium features.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/features/enable-premium', {
                        method: 'POST',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to enable features');
                      }
                      toast.success('Premium features enabled successfully');
                      refreshFeatures();
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to enable premium features');
                    }
                  }}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 w-full sm:w-auto shrink-0"
                >
                  Enable All Premium Features
                </Button>
              </div>
            </div>
          )}
          
          {(['basic', 'intermediate', 'advanced', 'power'] as const).map((level) => {
            const levelFeatures = groupedFeatures[level] || [];
            if (levelFeatures.length === 0) return null;

            return (
              <div key={level} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={LEVEL_COLORS[level]}>
                    {LEVEL_LABELS[level]}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {levelFeatures.map((feature) => {
                    const helpContent = HELP_CONTENT[feature.key as keyof typeof HELP_CONTENT];
                    const isPremiumLocked = feature.requiresPremium && !hasPremium;

                    return (
                      <div
                        key={feature.key}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">{feature.name}</h4>
                            {feature.requiresPremium && (
                              <Badge
                                variant="default"
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs shrink-0"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            {helpContent && (
                              <HelpTooltip content={helpContent.tooltip} />
                            )}
                            {feature.dependencies.length > 0 && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                <Info className="h-3 w-3 mr-1" />
                                Requires {feature.dependencies.length} feature{feature.dependencies.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                          {helpContent && (
                            <div className="pt-2">
                              <HelpPanel
                                title={helpContent.title}
                                description={helpContent.description}
                                trigger={
                                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                    Learn more →
                                  </Button>
                                }
                              >
                                {helpContent.sections.map((section, idx) => (
                                  <HelpSection key={idx} title={section.title}>
                                    {section.content}
                                  </HelpSection>
                                ))}
                              </HelpPanel>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-end sm:justify-start gap-2 shrink-0">
                          <Switch
                            checked={feature.enabled}
                            onCheckedChange={(checked) => handleToggle(feature, checked)}
                            disabled={togglingFeature === feature.key || isPremiumLocked || !isOwner || permissionsLoading}
                          />
                          {isPremiumLocked && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs whitespace-nowrap"
                              onClick={() => router.push('/settings/subscription')}
                            >
                              Upgrade →
                            </Button>
                          )}
                          {!isOwner && !permissionsLoading && (
                            <p className="text-xs text-muted-foreground text-right sm:text-right hidden sm:block">Only account owners can manage features</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, feature: null, action: 'enable' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Disable {confirmDialog.feature?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Disabling this feature may result in data loss. Historical data will be preserved,
                  but you will no longer be able to track new data for this feature.
                </p>
                <p className="font-semibold">
                  Are you sure you want to continue?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.feature && performToggle(confirmDialog.feature, false)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable Feature
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

