/** Fixed UI catalog the onboarding agent may emit. */

export type OnboardingScreenType =
  | 'choice'
  | 'form'
  | 'review_plan'
  | 'next_steps'
  | 'done';

export interface OnboardingChoiceOption {
  id: string;
  label: string;
  description?: string;
  payload?: Record<string, unknown>;
}

export interface OnboardingFormField {
  id: string;
  label: string;
  type: 'money' | 'text' | 'textarea' | 'select' | 'multiselect';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number | string[];
}

export interface ProposedAccount {
  name: string;
  balance: number;
  account_type: 'checking' | 'savings' | 'cash' | 'other';
}

export interface ProposedCategory {
  name: string;
  monthly_amount: number;
}

export interface ProposedGoal {
  name: string;
  goal_type: 'envelope' | 'account-linked' | 'debt-paydown';
  target_amount: number;
  monthly_contribution: number;
  notes?: string;
}

export interface ProposedPlan {
  accounts: ProposedAccount[];
  categories: ProposedCategory[];
  monthlyIncome?: number;
  goals?: ProposedGoal[];
  notes?: string;
}

export interface NextStepCard {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
}

export interface OnboardingScreenBase {
  type: OnboardingScreenType;
  title: string;
  body?: string;
  /** Show optional free-text box under primary controls */
  allowFreeText?: boolean;
  freeTextPlaceholder?: string;
}

export interface ChoiceScreen extends OnboardingScreenBase {
  type: 'choice';
  options: OnboardingChoiceOption[];
}

export interface FormScreen extends OnboardingScreenBase {
  type: 'form';
  fields: OnboardingFormField[];
  submitLabel?: string;
}

export interface ReviewPlanScreen extends OnboardingScreenBase {
  type: 'review_plan';
  plan: ProposedPlan;
  confirmLabel?: string;
  backOptionId?: string;
}

export interface NextStepsScreen extends OnboardingScreenBase {
  type: 'next_steps';
  steps: NextStepCard[];
  doneLabel?: string;
}

export interface DoneScreen extends OnboardingScreenBase {
  type: 'done';
  summary?: string;
}

export type OnboardingScreen =
  | ChoiceScreen
  | FormScreen
  | ReviewPlanScreen
  | NextStepsScreen
  | DoneScreen;

export type OnboardingUserAction =
  | { type: 'start' }
  | { type: 'choice'; optionId: string; payload?: Record<string, unknown> }
  | { type: 'submit_form'; values: Record<string, unknown> }
  | { type: 'confirm_plan'; plan: ProposedPlan }
  | { type: 'skip' }
  | { type: 'free_text'; text: string }
  | { type: 'continue' }
  | { type: 'done' };

export interface OnboardingSessionState {
  stage:
    | 'welcome'
    | 'experience'
    | 'situation'
    | 'finances'
    | 'categories'
    | 'review'
    | 'goals'
    | 'next_steps'
    | 'done'
    | 'skipped';
  experienceLevel?: 'beginner' | 'some' | 'power';
  situation?: string;
  checkingBalance?: number;
  savingsBalance?: number;
  monthlyIncome?: number;
  selectedCategories?: string[];
  plan?: ProposedPlan;
  applied?: boolean;
  goalsCreated?: boolean;
  freeTextNotes?: string[];
}

export interface OnboardingTurnRequest {
  conversationId?: string | null;
  action: OnboardingUserAction;
  /** Client-side session snapshot; server merges and persists */
  state?: Partial<OnboardingSessionState>;
}

export interface OnboardingTurnResponse {
  conversationId: string;
  screen: OnboardingScreen;
  state: OnboardingSessionState;
  applied?: {
    accountsCreated: number;
    categoriesCreated: number;
    goalsCreated: number;
    settingsUpdated: boolean;
  };
  usedFallback?: boolean;
}
