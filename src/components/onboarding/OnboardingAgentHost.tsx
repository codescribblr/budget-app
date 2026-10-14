'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useFeatures } from '@/contexts/FeatureContext';
import type { FeatureName } from '@/lib/feature-flags';
import { OnboardingScreenRenderer } from '@/components/onboarding/OnboardingScreenRenderer';
import type {
  OnboardingScreen,
  OnboardingSessionState,
  OnboardingTurnResponse,
  OnboardingUserAction,
} from '@/lib/ai/onboarding/types';

const DEFAULT_ENABLED =
  process.env.NEXT_PUBLIC_AI_ONBOARDING_DEFAULT === 'true';

function shouldUseAiOnboarding(
  isFeatureEnabled: (name: FeatureName) => boolean
): boolean {
  return DEFAULT_ENABLED || isFeatureEnabled('ai_onboarding');
}

/**
 * AI-augmented first-login host. Mounted beside the legacy wizard;
 * only opens when AI onboarding is enabled and the account looks empty.
 */
export function OnboardingAgentHost() {
  const { isFeatureEnabled, loading: featuresLoading } = useFeatures();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingSessionState | null>(null);
  const [screen, setScreen] = useState<OnboardingScreen | null>(null);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  const enabled = shouldUseAiOnboarding(isFeatureEnabled);

  const runTurn = useCallback(
    async (action: OnboardingUserAction, currentState?: OnboardingSessionState | null) => {
      setBusy(true);
      try {
        const response = await fetch('/api/ai/onboarding/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            action,
            state: currentState || state || undefined,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || err.error || 'Onboarding turn failed');
        }

        const data = (await response.json()) as OnboardingTurnResponse;
        setConversationId(data.conversationId);
        setState(data.state);
        setScreen(data.screen);

        if (data.applied) {
          toast.success(
            `Created ${data.applied.accountsCreated} account(s) and ${data.applied.categoriesCreated} categories` +
              (data.applied.goalsCreated ? `, ${data.applied.goalsCreated} goal(s)` : '')
          );
        }

        if (data.screen.type === 'done' && action.type === 'done') {
          setFinished(true);
          setOpen(false);
          window.location.href = '/dashboard';
        }

        return data;
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Something went wrong');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [conversationId, state]
  );

  useEffect(() => {
    if (featuresLoading || started) return;

    const check = async () => {
      try {
        if (!enabled) {
          setChecking(false);
          return;
        }

        const [accountsRes, categoriesRes, settingsRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/categories'),
          fetch('/api/settings'),
        ]);

        if (!accountsRes.ok || !categoriesRes.ok || !settingsRes.ok) {
          setChecking(false);
          return;
        }

        const [accounts, categories, settings] = await Promise.all([
          accountsRes.json(),
          categoriesRes.json(),
          settingsRes.json(),
        ]);

        const hasSkipped =
          settings?.budget_wizard_skipped === 'true' ||
          settings?.ai_onboarding_skipped === 'true';
        const hasCompleted =
          Boolean(settings?.budget_wizard_completed) ||
          Boolean(settings?.ai_onboarding_completed);
        const userCategories = (categories || []).filter((cat: any) => !cat.is_system);

        if (
          !hasSkipped &&
          !hasCompleted &&
          (accounts?.length || 0) === 0 &&
          userCategories.length === 0
        ) {
          setStarted(true);
          setOpen(true);
          await runTurn({ type: 'start' }, { stage: 'welcome' });
        }
      } catch (error) {
        console.error('Error checking AI onboarding:', error);
      } finally {
        setChecking(false);
      }
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once when features resolve
  }, [featuresLoading, enabled, started]);

  const handleAction = async (action: OnboardingUserAction) => {
    if (action.type === 'done' && (screen?.type === 'done' || screen?.type === 'next_steps')) {
      setFinished(true);
      setOpen(false);
      window.location.href = '/dashboard';
      return;
    }
    await runTurn(action);
  };

  const handleSkip = async () => {
    if (finished) return;
    setFinished(true);
    await runTurn({ type: 'skip' });
    setOpen(false);
  };

  if (checking || !enabled || !open || !screen) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !finished) {
          void handleSkip();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Budget setup coach
          </DialogTitle>
          <DialogDescription>
            Adaptive setup that builds your starter budget from your situation and goals.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          {busy ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
          <OnboardingScreenRenderer screen={screen} busy={busy} onAction={handleAction} />
        </div>

        <div className="flex justify-end border-t pt-3">
          <Button variant="ghost" size="sm" disabled={busy} onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Whether the AI onboarding host should own first-run (so legacy wizard stays closed).
 */
export function useAiOnboardingActive(): boolean {
  const { isFeatureEnabled, loading } = useFeatures();
  if (loading) return DEFAULT_ENABLED;
  return shouldUseAiOnboarding(isFeatureEnabled);
}
