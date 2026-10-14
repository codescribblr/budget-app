/** Shared copy for the Budget Habit Guide (coach exit, dashboard, page tips, Help). */

export const HABIT_GUIDE_HELP_HREF = '/help/getting-started/habit-loop';

export const HABIT_EXIT_BEATS = [
  {
    id: 'jobs',
    title: 'You gave money jobs',
    description:
      'Envelopes hold purpose — rent, groceries, gas. Available to Save is money still waiting for a job.',
  },
  {
    id: 'logging',
    title: 'Living without logging won’t help',
    description:
      'If you spend from the bank but never enter a transaction, your envelopes stay fake. Logging is what makes the budget real.',
  },
  {
    id: 'next',
    title: 'Do this next',
    description:
      'When you get paid, allocate what you can into envelopes (even part of the month). When you spend, log it. That’s the habit.',
  },
] as const;

export const HABIT_EXIT_PRIMARY = {
  id: 'log-spending',
  title: 'Log your first purchase',
  description:
    'Add a transaction and pick an envelope. Watch that envelope balance drop — that’s the habit working.',
  href: '/transactions',
  ctaLabel: 'Log spending',
} as const;

export const HABIT_EXIT_SECONDARY = {
  id: 'fund',
  title: 'I just got paid — allocate what you can',
  description:
    'You don’t need the whole month’s cash at once. Put this paycheck toward the bills and priorities that come first; the next paycheck can finish the rest.',
  href: '/money-movement',
  ctaLabel: 'Allocate this paycheck',
} as const;

export const HABIT_EXIT_TERTIARY = {
  id: 'import-later',
  title: 'Import later (optional)',
  description:
    'Once manual entry clicks, Import can save typing — still categorize so envelopes stay honest.',
  href: '/imports',
  ctaLabel: 'Import transactions',
} as const;

export const HABIT_EXIT_LEARN_MORE = {
  label: 'Learn more: Core Concepts',
  href: '/help/getting-started/core-concepts',
} as const;

export const HABIT_EXIT_REOPEN_HINT =
  'Show me later from Help → Budget Habit Guide.';

export const HABIT_MILESTONE_COPY = {
  fund: {
    id: 'fund' as const,
    title: 'Give this paycheck a job',
    body: 'You don’t have to fund the whole month at once. Allocate what you have toward the most important envelopes (or bills due soon). Another paycheck later can finish the monthly targets.',
    ctaLabel: 'Allocate this paycheck',
    href: '/money-movement',
  },
  log: {
    id: 'log' as const,
    title: 'Log your spending',
    body: 'When you spend, add a transaction and pick an envelope. That envelope balance goes down — the bank alone doesn’t update your budget.',
    ctaLabel: 'Add a transaction',
    href: '/transactions',
  },
  check: {
    id: 'check' as const,
    title: 'Check an envelope',
    body: 'Open Budgets (or the Dashboard) and look at an envelope you spent from. Seeing it drop is how you stay in control.',
    ctaLabel: 'View budgets',
    href: '/categories',
  },
  payday: {
    id: 'payday' as const,
    title: 'I just got paid',
    body: 'When a paycheck hits, open Money Movement and allocate what you have now — even if it’s only part of the month. Cover the bills and priorities that come first. “Funded This Month” tracks how far each envelope has gotten so the next paycheck can finish the job.',
    ctaLabel: 'Allocate this paycheck',
    href: '/money-movement',
  },
  import: {
    id: 'import' as const,
    title: 'Import when you’re ready',
    body: 'Once entering purchases feels natural, Import can save typing — still categorize so envelopes stay honest.',
    ctaLabel: 'Open Import',
    href: '/imports',
  },
} as const;

export const HABIT_PAGE_TIPS = {
  transactions: {
    tipId: 'transactions' as const,
    message:
      'When you buy groceries, add it here and pick Groceries — that envelope goes down. The bank balance alone doesn’t update your budget.',
    ctaLabel: 'Learn the habit',
    ctaHref: HABIT_GUIDE_HELP_HREF,
  },
  moneyMovement: {
    tipId: 'money-movement' as const,
    message:
      'Got paid? Allocate what you can now toward priority envelopes. You don’t need the full month’s cash — Funded This Month remembers what’s already covered so the next paycheck can finish the job.',
    ctaLabel: 'Learn the habit',
    ctaHref: HABIT_GUIDE_HELP_HREF,
  },
  import: {
    tipId: 'import' as const,
    message:
      'Once entering purchases feels natural, Import can save typing — still categorize so envelopes stay honest.',
    ctaLabel: 'Got it',
    ctaHref: null,
  },
} as const;

export const HABIT_GUIDE_TITLE = 'Budget Habit Guide';
export const HABIT_GUIDE_SUBTITLE =
  'For your first couple of months: when you get paid, give that money jobs; when you spend, log it. Partial paycheck allocations are normal — finish the month as the rest arrives.';
