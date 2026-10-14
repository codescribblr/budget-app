import { HELP_LINKS } from '@/lib/ai/workflow-guide';
import {
  DEFAULT_ONBOARDING_CATEGORIES,
  DEFAULT_SELECTED_CATEGORIES,
  suggestMonthlyAmount,
} from './defaults';
import type {
  OnboardingScreen,
  OnboardingSessionState,
  OnboardingUserAction,
  ProposedPlan,
  NextStepCard,
} from './types';

function welcomeScreen(): OnboardingScreen {
  return {
    type: 'choice',
    title: 'Welcome — let’s set up your budget',
    body: 'We’ll create accounts, envelopes, and a starter plan based on your situation. You can change everything later.',
    allowFreeText: true,
    freeTextPlaceholder: 'Or tell us in your own words where you’re starting from…',
    options: [
      {
        id: 'guided',
        label: 'Help me set up',
        description: 'Best if you’re new to budgeting or feeling overwhelmed',
        payload: { path: 'guided' },
      },
      {
        id: 'power',
        label: 'I know what I’m doing',
        description: 'Faster path — balances, income, categories, then review',
        payload: { path: 'power' },
      },
    ],
  };
}

function experienceScreen(): OnboardingScreen {
  return {
    type: 'choice',
    title: 'How familiar are you with budgeting?',
    body: 'This helps us explain concepts at the right level.',
    allowFreeText: true,
    freeTextPlaceholder: 'Anything else about your experience?',
    options: [
      { id: 'beginner', label: 'I’ve never really budgeted', payload: { experienceLevel: 'beginner' } },
      { id: 'some', label: 'I’ve tried before', payload: { experienceLevel: 'some' } },
      { id: 'power', label: 'I’m comfortable with budgets/spreadsheets', payload: { experienceLevel: 'power' } },
    ],
  };
}

function situationScreen(): OnboardingScreen {
  return {
    type: 'choice',
    title: 'What’s your main focus right now?',
    body: 'Pick the closest match — we’ll tailor starter envelopes and goals.',
    allowFreeText: true,
    freeTextPlaceholder: 'Describe your situation if none of these fit…',
    options: [
      { id: 'stressed', label: 'Paycheck to paycheck / need control', payload: { situation: 'stressed' } },
      { id: 'debt', label: 'Pay down debt', payload: { situation: 'debt' } },
      { id: 'saving', label: 'Build savings / emergency fund', payload: { situation: 'saving' } },
      { id: 'rebuilding', label: 'Starting over after a setback', payload: { situation: 'rebuilding' } },
      { id: 'stable', label: 'Stable — optimize my system', payload: { situation: 'stable' } },
    ],
  };
}

function financesScreen(state: OnboardingSessionState): OnboardingScreen {
  return {
    type: 'form',
    title: 'Your money snapshot',
    body:
      state.experienceLevel === 'beginner'
        ? 'Accounts are where your money lives (checking/savings). Approximate balances are fine.'
        : 'Enter current balances and approximate monthly take-home income.',
    allowFreeText: true,
    freeTextPlaceholder: 'Notes about irregular income, shared accounts, etc.',
    submitLabel: 'Continue',
    fields: [
      {
        id: 'checkingBalance',
        label: 'Checking balance',
        type: 'money',
        placeholder: '0.00',
        defaultValue: state.checkingBalance ?? '',
      },
      {
        id: 'savingsBalance',
        label: 'Savings balance (optional)',
        type: 'money',
        placeholder: '0.00',
        defaultValue: state.savingsBalance ?? '',
      },
      {
        id: 'monthlyIncome',
        label: 'Monthly take-home income (approx.)',
        type: 'money',
        placeholder: '0.00',
        helpText: 'Used to suggest starter envelope amounts. You can refine this later on the Income page.',
        defaultValue: state.monthlyIncome ?? '',
      },
    ],
  };
}

function categoriesScreen(state: OnboardingSessionState): OnboardingScreen {
  const defaults = state.selectedCategories?.length
    ? state.selectedCategories
    : [...DEFAULT_SELECTED_CATEGORIES];

  // Situation-aware extras
  if (state.situation === 'debt' && !defaults.includes('Debt Payment')) {
    defaults.push('Debt Payment');
  }
  if (
    (state.situation === 'saving' || state.situation === 'stressed' || state.situation === 'rebuilding') &&
    !defaults.includes('Emergency Fund')
  ) {
    defaults.push('Emergency Fund');
  }

  return {
    type: 'form',
    title: 'Choose your envelopes',
    body:
      state.experienceLevel === 'beginner'
        ? 'Envelopes (categories) are what your money is for — groceries, rent, savings. We’ll suggest monthly amounts next.'
        : 'Select the categories you want to start with. You can add more later.',
    submitLabel: 'Build my plan',
    fields: [
      {
        id: 'categories',
        label: 'Budget categories',
        type: 'multiselect',
        required: true,
        defaultValue: defaults,
        options: DEFAULT_ONBOARDING_CATEGORIES.map((name) => ({ value: name, label: name })),
      },
    ],
  };
}

function buildPlan(state: OnboardingSessionState): ProposedPlan {
  const income = state.monthlyIncome || 0;
  const categories = (state.selectedCategories?.length
    ? state.selectedCategories
    : [...DEFAULT_SELECTED_CATEGORIES]
  ).map((name) => ({
    name,
    monthly_amount: suggestMonthlyAmount(name, income),
  }));

  const accounts: ProposedPlan['accounts'] = [];
  if ((state.checkingBalance ?? 0) > 0 || state.experienceLevel !== 'power') {
    accounts.push({
      name: 'Checking Account',
      balance: state.checkingBalance ?? 0,
      account_type: 'checking',
    });
  }
  if ((state.savingsBalance ?? 0) > 0) {
    accounts.push({
      name: 'Savings Account',
      balance: state.savingsBalance ?? 0,
      account_type: 'savings',
    });
  }
  if (accounts.length === 0) {
    accounts.push({ name: 'Checking Account', balance: 0, account_type: 'checking' });
  }

  const goals: ProposedPlan['goals'] = [];
  if (
    state.situation === 'saving' ||
    state.situation === 'stressed' ||
    state.situation === 'rebuilding' ||
    state.experienceLevel === 'beginner'
  ) {
    const monthly = Math.max(25, suggestMonthlyAmount('Emergency Fund', income) || 50);
    goals.push({
      name: 'Emergency Fund',
      goal_type: 'envelope',
      target_amount: monthly * 3,
      monthly_contribution: monthly,
      notes: 'Starter goal — 1–3 months of essentials over time',
    });
  }

  return {
    accounts,
    categories,
    monthlyIncome: income || undefined,
    goals: goals.length ? goals : undefined,
    notes:
      state.experienceLevel === 'beginner'
        ? 'Suggested amounts are starting points based on your income. Adjust anything that doesn’t match your life.'
        : undefined,
  };
}

function reviewScreen(plan: ProposedPlan): OnboardingScreen {
  return {
    type: 'review_plan',
    title: 'Review your starter budget',
    body: 'Tweak amounts before we create anything. Nothing is saved until you confirm.',
    plan,
    confirmLabel: 'Create my budget',
  };
}

function nextStepsScreen(state: OnboardingSessionState, _goalsSkipped?: boolean): OnboardingScreen {
  const isPower = state.experienceLevel === 'power';

  const steps: NextStepCard[] = [
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
      id: 'log-spending',
      title: 'Log your first purchase',
      description:
        'Add a transaction and pick an envelope. Watch that envelope balance drop — that’s the habit working.',
      href: '/transactions',
      ctaLabel: 'Log spending',
    },
    {
      id: 'fund',
      title: 'I just got paid — allocate what you can',
      description:
        'You don’t need the whole month’s cash at once. Put this paycheck toward bills and priorities that come first; the next paycheck can finish the rest. Funded This Month tracks progress.',
      href: '/money-movement',
      ctaLabel: 'Allocate this paycheck',
    },
  ];

  if (!isPower) {
    steps.push({
      id: 'import-later',
      title: 'Import later (optional)',
      description:
        'Once manual entry clicks, Import can save typing — still categorize so envelopes stay honest.',
      href: '/imports',
      ctaLabel: 'Import transactions',
    });
    steps.push({
      id: 'concepts',
      title: 'Learn more',
      description: 'Accounts vs envelopes, Available to Save, and how money flows each payday.',
      href: HELP_LINKS.coreConcepts,
      ctaLabel: 'Core Concepts',
    });
  }

  steps.push({
    id: 'habit-guide',
    title: 'Find this again anytime',
    description:
      'The Budget Habit Guide stays with you for about two months — including reminders when you get paid.',
    href: HELP_LINKS.habitLoop,
    ctaLabel: 'Budget Habit Guide',
  });

  return {
    type: 'next_steps',
    title: isPower ? 'You’re set up — how this works' : 'How this works',
    body: isPower
      ? 'When you get paid, allocate what you can into envelopes. When you spend, log it. Partial paychecks are fine.'
      : 'Your accounts and envelopes are ready. Here’s the habit that makes them useful — including what to do on payday.',
    steps,
    doneLabel: 'Go to dashboard',
  };
}

function doneScreen(): OnboardingScreen {
  return {
    type: 'done',
    title: 'Welcome to your budget',
    summary: 'Your starter budget is ready. Head to the dashboard to see your envelopes and Available to Save.',
  };
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function appendFreeText(state: OnboardingSessionState, text?: string): OnboardingSessionState {
  if (!text?.trim()) return state;
  return {
    ...state,
    freeTextNotes: [...(state.freeTextNotes || []), text.trim()],
  };
}

/**
 * Deterministic onboarding flow used when Gemini is unavailable or returns invalid JSON.
 */
export function fallbackTurn(
  state: OnboardingSessionState,
  action: OnboardingUserAction
): { screen: OnboardingScreen; state: OnboardingSessionState } {
  let next = { ...state };

  if (action.type === 'start' || !state.stage || state.stage === 'welcome') {
    if (action.type === 'start') {
      next.stage = 'welcome';
      return { screen: welcomeScreen(), state: next };
    }
  }

  if (action.type === 'skip') {
    next.stage = 'skipped';
    return {
      screen: {
        type: 'done',
        title: 'Setup skipped',
        summary: 'You can restart setup anytime from Help → Wizards → Budget Setup.',
      },
      state: next,
    };
  }

  if (action.type === 'free_text') {
    next = appendFreeText(next, action.text);
    // Re-show current stage screen with acknowledgment in body via situation inference
    const lower = action.text.toLowerCase();
    if (/debt|card|loan|behind/.test(lower)) next.situation = next.situation || 'debt';
    if (/emergency|save|saving/.test(lower)) next.situation = next.situation || 'saving';
    if (/overwhelm|broke|paycheck|stress/.test(lower)) next.situation = next.situation || 'stressed';
    if (/never|new|beginner|don't know|dont know/.test(lower)) next.experienceLevel = next.experienceLevel || 'beginner';

    if (!next.experienceLevel) {
      next.stage = 'experience';
      return { screen: experienceScreen(), state: next };
    }
    if (!next.situation) {
      next.stage = 'situation';
      return { screen: situationScreen(), state: next };
    }
    next.stage = 'finances';
    return { screen: financesScreen(next), state: next };
  }

  if (action.type === 'choice') {
    const path = action.payload?.path as string | undefined;
    if (action.optionId === 'guided' || path === 'guided') {
      next.stage = 'experience';
      return { screen: experienceScreen(), state: next };
    }
    if (action.optionId === 'power' || path === 'power') {
      next.experienceLevel = 'power';
      next.stage = 'finances';
      return { screen: financesScreen(next), state: next };
    }

    if (action.payload?.experienceLevel) {
      next.experienceLevel = action.payload.experienceLevel as OnboardingSessionState['experienceLevel'];
      next.stage = 'situation';
      return { screen: situationScreen(), state: next };
    }

    if (action.payload?.situation || ['stressed', 'debt', 'saving', 'rebuilding', 'stable'].includes(action.optionId)) {
      next.situation = (action.payload?.situation as string) || action.optionId;
      next.stage = 'finances';
      return { screen: financesScreen(next), state: next };
    }

    if (action.optionId === 'skip_goals') {
      next.stage = 'next_steps';
      return { screen: nextStepsScreen(next, true), state: next };
    }
  }

  if (action.type === 'submit_form') {
    if (next.stage === 'finances' || action.values.checkingBalance !== undefined || action.values.monthlyIncome !== undefined) {
      next.checkingBalance = parseMoney(action.values.checkingBalance);
      next.savingsBalance = parseMoney(action.values.savingsBalance);
      next.monthlyIncome = parseMoney(action.values.monthlyIncome);
      if (typeof action.values.notes === 'string') {
        next = appendFreeText(next, action.values.notes);
      }
      next.stage = 'categories';
      return { screen: categoriesScreen(next), state: next };
    }

    if (action.values.categories !== undefined || next.stage === 'categories') {
      const cats = Array.isArray(action.values.categories)
        ? (action.values.categories as string[])
        : [...DEFAULT_SELECTED_CATEGORIES];
      next.selectedCategories = cats.length ? cats : [...DEFAULT_SELECTED_CATEGORIES];
      const plan = buildPlan(next);
      next.plan = plan;
      next.stage = 'review';
      return { screen: reviewScreen(plan), state: next };
    }
  }

  if (action.type === 'confirm_plan') {
    next.plan = action.plan;
    next.applied = true;
    next.stage = 'next_steps';
    return { screen: nextStepsScreen(next), state: next };
  }

  if (action.type === 'continue' || action.type === 'done') {
    next.stage = 'done';
    return { screen: doneScreen(), state: next };
  }

  // Default recovery
  next.stage = 'welcome';
  return { screen: welcomeScreen(), state: next };
}

export function initialOnboardingState(): OnboardingSessionState {
  return { stage: 'welcome' };
}
