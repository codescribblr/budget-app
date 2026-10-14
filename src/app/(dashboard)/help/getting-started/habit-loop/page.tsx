'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { Button } from '@/components/ui/button';
import { useHabitGuide } from '@/hooks/use-habit-guide';
import {
  HABIT_EXIT_BEATS,
  HABIT_GUIDE_SUBTITLE,
  HABIT_GUIDE_TITLE,
  HABIT_MILESTONE_COPY,
} from '@/lib/onboarding/habit-guide-copy';

export default function HabitLoopHelpPage() {
  const { state, reopen, loading } = useHabitGuide({ skipDataFetch: true });
  const [reopening, setReopening] = useState(false);
  const [reopened, setReopened] = useState(false);

  const handleReopen = async () => {
    setReopening(true);
    await reopen();
    setReopened(true);
    setReopening(false);
  };

  const steps = [
    {
      title: HABIT_MILESTONE_COPY.fund.title,
      content: (
        <>
          <p>{HABIT_MILESTONE_COPY.fund.body}</p>
          <p className="mt-2">
            <Link href="/money-movement" className="text-primary hover:underline">
              Open Money Movement
            </Link>
          </p>
        </>
      ),
    },
    {
      title: HABIT_MILESTONE_COPY.payday.title,
      content: (
        <>
          <p>{HABIT_MILESTONE_COPY.payday.body}</p>
          <p className="mt-2 text-xs">
            Example: your month needs $4,000 across envelopes and the first paycheck is $2,000. Allocate
            that $2,000 toward rent and other early bills. When the next $2,000 arrives, allocate again —
            Funded This Month shows what’s already covered.
          </p>
          <p className="mt-2">
            <Link href="/money-movement" className="text-primary hover:underline">
              Allocate this paycheck
            </Link>
          </p>
        </>
      ),
    },
    {
      title: HABIT_MILESTONE_COPY.log.title,
      content: (
        <>
          <p>{HABIT_MILESTONE_COPY.log.body}</p>
          <p className="mt-2">
            <Link href="/transactions" className="text-primary hover:underline">
              Open Transactions
            </Link>
          </p>
        </>
      ),
    },
    {
      title: HABIT_MILESTONE_COPY.check.title,
      content: (
        <>
          <p>{HABIT_MILESTONE_COPY.check.body}</p>
          <p className="mt-2">
            <Link href="/categories" className="text-primary hover:underline">
              View budgets
            </Link>
            {' · '}
            <Link href="/dashboard" className="text-primary hover:underline">
              Dashboard
            </Link>
          </p>
        </>
      ),
    },
    {
      title: HABIT_MILESTONE_COPY.import.title,
      content: (
        <>
          <p>{HABIT_MILESTONE_COPY.import.body}</p>
          <p className="mt-2">
            <Link href="/imports" className="text-primary hover:underline">
              Open Import
            </Link>
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help', href: '/help' },
          { label: 'Getting Started', href: '/help/getting-started/welcome' },
          { label: HABIT_GUIDE_TITLE, href: '/help/getting-started/habit-loop' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{HABIT_GUIDE_TITLE}</h1>
        <p className="mt-2 text-muted-foreground">{HABIT_GUIDE_SUBTITLE}</p>
      </div>

      <Callout type="tip" title="The three beats">
        <ol className="list-decimal list-inside space-y-2 mt-2">
          {HABIT_EXIT_BEATS.map((beat) => (
            <li key={beat.id}>
              <strong>{beat.title}</strong> — {beat.description}
            </li>
          ))}
        </ol>
      </Callout>

      <Callout type="info" title="When you get paid">
        <p className="mt-1">
          Most people won’t stash every paycheck in a buffer until the 1st. That’s fine. Allocate what
          landed today toward the envelopes that matter first. The app remembers Funded This Month so a
          later paycheck can finish the monthly plan without starting over.
        </p>
      </Callout>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Checklist</h2>
        <StepList steps={steps} />
      </section>

      <Callout type="info" title="Dismissed the tips?">
        <p className="mt-1">
          Tips auto-surface for about two months after you start. You can turn the dashboard Habit Guide
          back on anytime from this page.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => void handleReopen()}
            disabled={loading || reopening}
            size="sm"
          >
            {reopening ? 'Reopening…' : reopened ? 'Guide reopened' : 'Show Habit Guide on Dashboard'}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
        {!loading && !state.enabled ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Habit tips are currently off for this account. Use the button above to turn them back on.
          </p>
        ) : null}
      </Callout>

      <WasThisHelpful articlePath="/help/getting-started/habit-loop" />
    </div>
  );
}
