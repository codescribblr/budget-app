'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/types';
import {
  HABIT_EXIT_BEATS,
  HABIT_EXIT_LEARN_MORE,
  HABIT_EXIT_PRIMARY,
  HABIT_EXIT_REOPEN_HINT,
  HABIT_EXIT_SECONDARY,
  HABIT_EXIT_TERTIARY,
  HABIT_GUIDE_HELP_HREF,
} from '@/lib/onboarding/habit-guide-copy';

interface WizardCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onOpenEditCategory?: (category: Category) => void;
  incomeSettings?: {
    annual_income?: string;
    annual_salary?: string;
  };
  hasIncomeConfigured?: boolean;
}

export function WizardCompletionDialog({
  open,
  onOpenChange,
}: WizardCompletionDialogProps) {
  const router = useRouter();

  const go = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">How this works</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Your accounts and envelopes are ready. Here’s the habit that makes them useful.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {HABIT_EXIT_BEATS.map((beat) => (
            <div key={beat.id} className="rounded-lg border p-3">
              <h3 className="font-medium text-sm">{beat.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{beat.description}</p>
            </div>
          ))}

          <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
            <h3 className="font-semibold">{HABIT_EXIT_PRIMARY.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{HABIT_EXIT_PRIMARY.description}</p>
            <Button size="sm" className="mt-3" onClick={() => go(HABIT_EXIT_PRIMARY.href)}>
              {HABIT_EXIT_PRIMARY.ctaLabel}
            </Button>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-medium">{HABIT_EXIT_SECONDARY.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{HABIT_EXIT_SECONDARY.description}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => go(HABIT_EXIT_SECONDARY.href)}
            >
              {HABIT_EXIT_SECONDARY.ctaLabel}
            </Button>
          </div>

          <details className="rounded-lg border border-dashed p-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Optional: import later & learn more
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{HABIT_EXIT_TERTIARY.description}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => go(HABIT_EXIT_TERTIARY.href)}
                >
                  {HABIT_EXIT_TERTIARY.ctaLabel}
                </Button>
              </div>
              <Button asChild size="sm" variant="link" className="h-auto p-0">
                <Link href={HABIT_EXIT_LEARN_MORE.href} onClick={() => onOpenChange(false)}>
                  {HABIT_EXIT_LEARN_MORE.label}
                </Link>
              </Button>
            </div>
          </details>

          <p className="text-xs text-muted-foreground">
            {HABIT_EXIT_REOPEN_HINT}{' '}
            <Link
              href={HABIT_GUIDE_HELP_HREF}
              className="text-primary hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Open Habit Guide
            </Link>
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Go to dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
