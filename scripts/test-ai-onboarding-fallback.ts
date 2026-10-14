/**
 * Smoke test for deterministic AI onboarding fallback (no Gemini / DB required).
 * Run: npx tsx scripts/test-ai-onboarding-fallback.ts
 */
import { fallbackTurn, initialOnboardingState } from '../src/lib/ai/onboarding/fallback';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let state = initialOnboardingState();

const start = fallbackTurn(state, { type: 'start' });
assert(start.screen.type === 'choice', 'expected welcome choice');
state = start.state;

const guided = fallbackTurn(state, {
  type: 'choice',
  optionId: 'guided',
  payload: { path: 'guided' },
});
assert(guided.screen.type === 'choice', 'expected experience choice');
state = guided.state;

const beginner = fallbackTurn(state, {
  type: 'choice',
  optionId: 'beginner',
  payload: { experienceLevel: 'beginner' },
});
state = beginner.state;

const stressed = fallbackTurn(state, {
  type: 'choice',
  optionId: 'stressed',
  payload: { situation: 'stressed' },
});
assert(stressed.screen.type === 'form', 'expected finances form');
state = stressed.state;

const finances = fallbackTurn(state, {
  type: 'submit_form',
  values: { checkingBalance: '1200', savingsBalance: '100', monthlyIncome: '4000' },
});
assert(finances.screen.type === 'form', 'expected categories form');
state = finances.state;

const categories = fallbackTurn(state, {
  type: 'submit_form',
  values: {
    categories: ['Rent/Mortgage', 'Groceries', 'Emergency Fund', 'Savings'],
  },
});
assert(categories.screen.type === 'review_plan', 'expected review_plan');
assert(
  categories.screen.type === 'review_plan' &&
    categories.screen.plan.categories.every((c) => c.monthly_amount > 0),
  'expected suggested monthly amounts from income'
);
state = categories.state;

const confirmed = fallbackTurn(state, {
  type: 'confirm_plan',
  plan: state.plan!,
});
assert(confirmed.screen.type === 'next_steps', 'expected next_steps');
assert(
  confirmed.screen.type === 'next_steps' &&
    confirmed.screen.steps.some((s) => s.href === '/money-movement'),
  'expected Money Movement next step'
);

const freeTextPath = fallbackTurn(initialOnboardingState(), { type: 'start' });
const afterText = fallbackTurn(freeTextPath.state, {
  type: 'free_text',
  text: "I've never budgeted and I'm paycheck to paycheck",
});
assert(afterText.state.experienceLevel === 'beginner', 'free text should infer beginner');
assert(afterText.state.situation === 'stressed', 'free text should infer stressed');

console.log('AI onboarding fallback smoke test passed.');
