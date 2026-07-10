import type { UserContext } from './types';
import { getCreditCardBalanceOwed, getCreditCardStatementBalance } from '@/lib/credit-card-balance';

export type IncomeProfile = 'regular' | 'irregular' | 'multiple_streams' | 'unconfigured';
export type DebtProfile = 'none' | 'credit_card' | 'mixed';

export interface ChatQuickAction {
  id: string;
  label: string;
  query: string;
  priority: number;
}

export interface UserWorkflowProfile {
  incomeProfile: IncomeProfile;
  incomeProfileLabel: string;
  debtProfile: DebtProfile;
  totalCreditCardDebt: number;
  totalLoanDebt: number;
  hasDebtPaydownGoal: boolean;
  hasCreditCardPaymentCategory: boolean;
  hasIncomeBuffer: boolean;
  incomeBufferBalance: number;
  payFrequencies: string[];
  incomeStreamCount: number;
}

const IRREGULAR_PAY_FREQUENCIES = new Set(['weekly', 'quarterly', 'annually']);
const REGULAR_PAY_FREQUENCIES = new Set(['bi-weekly', 'semi-monthly', 'monthly']);
const IRREGULAR_INCOME_KEYWORDS = /\b(freelance|contract|commission|1099|gig|consult|self[- ]?employ|variable|seasonal|hourly)\b/i;

const CC_PAYMENT_CATEGORY_PATTERN =
  /\b(credit\s*card|cc\s*payment|card\s*payment|debt\s*payment|pay\s*off\s*card)\b/i;

const HELP_LINKS = {
  irregularIncome: '/help/tutorials/irregular-income',
  incomeBuffer: '/help/features/income-buffer',
  incomeBufferWizard: '/help/wizards/income-buffer',
  accounts: '/help/features/accounts',
  moneyMovement: '/help/features/money-movement',
  categories: '/help/features/categories',
  goals: '/help/features/goals',
  loans: '/help/features/loans',
  quickStart: '/help/getting-started/quick-start',
  firstBudget: '/help/tutorials/first-budget',
} as const;

function sumCreditCardDebt(context: UserContext): number {
  return (context.creditCards || []).reduce(
    (sum, cc) => sum + getCreditCardBalanceOwed(cc),
    0
  );
}

function sumLoanDebt(context: UserContext): number {
  return (context.loans || []).reduce((sum, loan) => sum + Math.max(0, loan.balance || 0), 0);
}

function hasCreditCardPaymentCategory(context: UserContext): boolean {
  return context.categories.some((cat) => CC_PAYMENT_CATEGORY_PATTERN.test(cat.name));
}

function classifyIncomeProfile(context: UserContext): Pick<
  UserWorkflowProfile,
  'incomeProfile' | 'incomeProfileLabel' | 'payFrequencies' | 'incomeStreamCount'
> {
  const streams = context.incomeStreamsDetail || [];
  const payFrequencies = streams.length > 0
    ? [...new Set(streams.map((s) => s.pay_frequency))]
    : context.incomeSettings.pay_frequency
      ? [context.incomeSettings.pay_frequency]
      : [];

  if (streams.length === 0 && !context.incomeSettings.annual_income) {
    return {
      incomeProfile: 'unconfigured',
      incomeProfileLabel: 'Income not configured',
      payFrequencies,
      incomeStreamCount: 0,
    };
  }

  if (streams.length > 1) {
    return {
      incomeProfile: 'multiple_streams',
      incomeProfileLabel: 'Multiple income streams',
      payFrequencies,
      incomeStreamCount: streams.length,
    };
  }

  const stream = streams[0];
  const payFrequency = stream?.pay_frequency || context.incomeSettings.pay_frequency || 'monthly';
  const streamName = stream?.name || '';
  const linkedAsset = stream?.linked_asset_name;

  if (
    IRREGULAR_PAY_FREQUENCIES.has(payFrequency) ||
    IRREGULAR_INCOME_KEYWORDS.test(streamName) ||
    linkedAsset
  ) {
    return {
      incomeProfile: 'irregular',
      incomeProfileLabel: 'Variable or non-traditional income',
      payFrequencies: payFrequencies.length > 0 ? payFrequencies : [payFrequency],
      incomeStreamCount: streams.length || 1,
    };
  }

  if (REGULAR_PAY_FREQUENCIES.has(payFrequency)) {
    return {
      incomeProfile: 'regular',
      incomeProfileLabel: `Regular ${payFrequency.replace('-', ' ')} income`,
      payFrequencies: [payFrequency],
      incomeStreamCount: streams.length || 1,
    };
  }

  return {
    incomeProfile: 'irregular',
    incomeProfileLabel: 'Variable income pattern',
    payFrequencies: [payFrequency],
    incomeStreamCount: streams.length || 1,
  };
}

export function analyzeUserWorkflowProfile(context: UserContext): UserWorkflowProfile {
  const income = classifyIncomeProfile(context);
  const totalCreditCardDebt = sumCreditCardDebt(context);
  const totalLoanDebt = sumLoanDebt(context);
  const hasDebtPaydownGoal = context.goals.some((g) => g.goal_type === 'debt-paydown');

  let debtProfile: DebtProfile = 'none';
  if (totalCreditCardDebt > 0 && totalLoanDebt > 0) {
    debtProfile = 'mixed';
  } else if (totalCreditCardDebt > 0) {
    debtProfile = 'credit_card';
  } else if (totalLoanDebt > 0) {
    debtProfile = 'mixed';
  }

  return {
    ...income,
    debtProfile,
    totalCreditCardDebt,
    totalLoanDebt,
    hasDebtPaydownGoal,
    hasCreditCardPaymentCategory: hasCreditCardPaymentCategory(context),
    hasIncomeBuffer: context.incomeBuffer !== null,
    incomeBufferBalance: context.incomeBuffer?.current_balance || 0,
  };
}

function buildIncomeWorkflowQuery(profile: UserWorkflowProfile): ChatQuickAction {
  const baseInstruction =
    'Recommend a step-by-step workflow for using THIS budgeting app based on my income setup. Reference specific app features (Money Movement, categories, Income Buffer, Smart Allocation, etc.) and link to relevant help pages using paths like /help/.... Be practical and ordered by what I should do first.';

  if (profile.incomeProfile === 'unconfigured') {
    return {
      id: 'income-workflow',
      label: 'Set Up My Workflow',
      query: `I haven't configured my income yet. ${baseInstruction} Start with what I should set up first in Settings/Income, then how to run my monthly budget cycle.`,
      priority: 100,
    };
  }

  if (profile.incomeProfile === 'irregular' || profile.incomeProfile === 'multiple_streams') {
    const bufferNote = profile.hasIncomeBuffer
      ? 'I already have an Income Buffer category — build on that.'
      : 'I do not have an Income Buffer set up yet.';
    return {
      id: 'income-workflow',
      label: 'My Income Workflow',
      query: `My income is variable or comes from multiple sources (${profile.incomeProfileLabel}). ${bufferNote} ${baseInstruction} Focus on the Income Buffer approach vs conservative budgeting, and which help guides apply (${HELP_LINKS.irregularIncome}, ${HELP_LINKS.incomeBuffer}).`,
      priority: 100,
    };
  }

  const freq = profile.payFrequencies[0] || 'regular';
  const fundingNote =
    freq === 'bi-weekly' || freq === 'semi-monthly'
      ? 'I get paid more than once per month — address Monthly Funding Tracking and how to allocate each paycheck without double-funding categories.'
      : 'Walk me through the ideal monthly cycle from paycheck to allocation to spending.';

  return {
    id: 'income-workflow',
    label: 'My Income Workflow',
    query: `I have ${profile.incomeProfileLabel}. ${fundingNote} ${baseInstruction}`,
    priority: 100,
  };
}

function buildDebtWorkflowQuery(profile: UserWorkflowProfile, context: UserContext): ChatQuickAction {
  const liveCcDebt = profile.totalCreditCardDebt;
  const statementDebt = (context.creditCards || []).reduce((sum, cc) => {
    const stmt = getCreditCardStatementBalance(cc);
    return sum + (stmt ?? 0);
  }, 0);
  const ccDebtForSummary = statementDebt > 0 ? statementDebt : liveCcDebt;

  const ccSummary =
    ccDebtForSummary > 0
      ? `I owe about $${ccDebtForSummary.toFixed(0)} across ${context.creditCards?.length || 0} credit card(s).`
      : '';
  const loanSummary =
    profile.totalLoanDebt > 0
      ? `I also have about $${profile.totalLoanDebt.toFixed(0)} in loan debt.`
      : '';
  const setupNotes = [
    profile.hasCreditCardPaymentCategory
      ? 'I already have a credit card payment category.'
      : 'I do NOT have a dedicated credit card payment category yet.',
    profile.hasDebtPaydownGoal
      ? 'I have debt-paydown goal(s) set up.'
      : 'I have NOT set up debt-paydown goals yet.',
  ].join(' ');

  return {
    id: 'debt-workflow',
    label: 'Pay Down Debt',
    query: `I carry balances month to month and want to pay down debt systematically in this app. ${ccSummary} ${loanSummary} ${setupNotes} Recommend a concrete monthly workflow: how to set up categories, allocate payments each month, record/import CC purchases (categories track in-month spending), enter statement balance at reconcile time, use debt-paydown goals, and measure progress. Net worth uses live balance (limit − available credit); statement balance is for payoff planning only. Reference help pages like ${HELP_LINKS.accounts}, ${HELP_LINKS.moneyMovement}, ${HELP_LINKS.goals}, and ${HELP_LINKS.categories}.`,
    priority: 95,
  };
}

function shouldOfferDebtWorkflow(profile: UserWorkflowProfile, context: UserContext): boolean {
  if (profile.totalLoanDebt > 0) return true;
  const hasStatementDebt = (context.creditCards || []).some((cc) => {
    const stmt = getCreditCardStatementBalance(cc);
    return stmt != null && stmt > 0;
  });
  if (hasStatementDebt) return true;
  if (profile.hasDebtPaydownGoal || profile.hasCreditCardPaymentCategory) return true;
  // Live CC balance alone often reflects in-month usage before payoff — not a debt signal
  return false;
}

export function buildPersonalizedQuickActions(context: UserContext): ChatQuickAction[] {
  const profile = analyzeUserWorkflowProfile(context);
  const actions: ChatQuickAction[] = [
    buildIncomeWorkflowQuery(profile),
    {
      id: 'budget-check',
      label: 'Budget Check',
      query: 'Am I on track with my budget this month? Highlight any categories that need attention.',
      priority: 50,
    },
  ];

  if (shouldOfferDebtWorkflow(profile, context)) {
    actions.push(buildDebtWorkflowQuery(profile, context));
  } else {
    actions.push({
      id: 'savings-tips',
      label: 'Savings Tips',
      query: 'Based on my spending patterns, where can I save money this month?',
      priority: 40,
    });
  }

  return actions.sort((a, b) => b.priority - a.priority);
}

export function buildUserSituationSummary(context: UserContext): string {
  const profile = analyzeUserWorkflowProfile(context);
  const lines = [
    `Income profile: ${profile.incomeProfileLabel} (${profile.incomeStreamCount} stream(s), pay frequencies: ${profile.payFrequencies.join(', ') || 'unknown'})`,
  ];

  if (profile.hasIncomeBuffer) {
    lines.push(
      `Income Buffer: configured, balance $${profile.incomeBufferBalance.toFixed(2)}`
    );
  }

  if (profile.totalCreditCardDebt > 0) {
    const cardDetails = (context.creditCards || [])
      .filter((cc) => getCreditCardBalanceOwed(cc) > 0)
      .map((cc) => {
        const owed = getCreditCardBalanceOwed(cc);
        const stmt = getCreditCardStatementBalance(cc);
        const stmtNote =
          stmt != null
            ? ` | Last statement: $${stmt.toFixed(2)}${cc.statement_balance_as_of ? ` (${cc.statement_balance_as_of})` : ''}`
            : '';
        return `${cc.name}: $${owed.toFixed(2)} owed (live)${stmtNote}`;
      })
      .join('; ');
    lines.push(`Credit card debt: $${profile.totalCreditCardDebt.toFixed(2)} total (${cardDetails})`);
    lines.push(
      `CC payment category: ${profile.hasCreditCardPaymentCategory ? 'yes' : 'NOT set up'}`
    );
  }

  if (profile.totalLoanDebt > 0) {
    lines.push(`Loan debt: $${profile.totalLoanDebt.toFixed(2)} total`);
  }

  if (profile.hasDebtPaydownGoal) {
    lines.push('Has debt-paydown goal(s) configured');
  }

  const enabled = context.enabledFeatures || [];
  if (enabled.length > 0) {
    lines.push(`Enabled app features: ${enabled.join(', ')}`);
  }

  return lines.join('\n');
}

export function getAppWorkflowDocumentation(): string {
  return `
APP WORKFLOW GUIDE (use when recommending how to use this budgeting app):

This is an envelope budgeting app. Money lives in bank accounts (locations) and is allocated to categories (envelopes) before spending.

KEY FEATURES AND HELP PAGES:
- Quick Start: ${HELP_LINKS.quickStart}
- First Budget Tutorial: ${HELP_LINKS.firstBudget}
- Accounts & Credit Cards: ${HELP_LINKS.accounts}
- Budget Categories (Monthly Expense, Accumulation, Target Balance): ${HELP_LINKS.categories}
- Money Movement (allocate income to categories): ${HELP_LINKS.moneyMovement}
- Income Buffer (smooth irregular income): ${HELP_LINKS.incomeBuffer}
- Income Buffer Wizard: ${HELP_LINKS.incomeBufferWizard}
- Irregular Income Tutorial: ${HELP_LINKS.irregularIncome}
- Financial Goals (including debt-paydown goals): ${HELP_LINKS.goals}
- Loans: ${HELP_LINKS.loans}

INCOME WORKFLOWS BY TYPE:

1. REGULAR PAYCHECK (bi-weekly, semi-monthly, monthly):
   - Configure income in Settings → Income (streams with pay frequency and tax rate)
   - On payday: update checking account balance, then use Money Movement to allocate to categories
   - If paid more than once per month: enable Monthly Funding Tracking so categories aren't double-funded
   - Use category priorities (1=highest) so essentials get funded first when money is tight
   - Optional: Smart Allocation automates distribution by priority

2. VARIABLE / IRREGULAR INCOME (freelance, commission, seasonal):
   - Recommended: Income Buffer method — save 1-2 months of expenses, then budget from the buffer each month
   - High-income months: add extra to Income Buffer; start of month: fund all categories from buffer
   - Alternative: Conservative budgeting — budget only for lowest expected monthly income
   - See ${HELP_LINKS.irregularIncome} and ${HELP_LINKS.incomeBuffer}

3. MULTIPLE INCOME STREAMS:
   - Set up each stream separately in Income settings (different pay frequencies and tax rates)
   - Allocate from each deposit as it arrives, OR aggregate through Income Buffer for simpler monthly planning
   - Linked asset income (rental, etc.) stops when asset is sold — mention if relevant

CREDIT CARD DEBT WORKFLOW (for users who carry balances month-to-month):

Most users with credit card debt need a different workflow than paying in full each month.
Debt is tracked two ways:
- **Live balance** (credit_limit − available_credit): used for net worth and reflects in-month card usage
- **Statement balance** (optional, updated at import/reconcile): anchors monthly payoff planning only

Category envelopes track in-month spending separately — do NOT conflate the two.

1. SET UP CARDS: Add each credit card with credit limit and available credit. When importing
   or reconciling monthly, enter the **statement balance** from the bill — this anchors debt payoff tracking.

2. CREATE PAYMENT CATEGORY: Add a Monthly Expense category like "Credit Card Payment" with a monthly
   target = minimum payment + extra payoff amount. Set priority 5-6 (debt payments).

3. MONTHLY ALLOCATION CYCLE:
   - When income arrives: allocate to "Credit Card Payment" category via Money Movement FIRST (after essentials)
   - Record/import CC purchases as expense transactions on the card — these update category envelopes
   - CC statement balance / available credit are updated separately at reconcile time, not from each transaction
     (charges can take days to clear; most users import once per month)

4. PAY THE BILL: When the statement is due, record the payment. Update statement balance or available
   credit to reflect the new owed amount after payment.

5. DEBT PAYDOWN GOALS: Create a debt-paydown goal linked to the credit card — uses statement balance
   when set to track payoff progress.

6. MEASURE PROGRESS: Compare statement balance month-over-month; ensure payment category is funded before due date.

7. PAYOFF STRATEGIES: Mention avalanche (highest interest first) or snowball (smallest balance first) if multiple cards.

8. IMPORTANT DISTINCTION: Category balances = in-month spending plan. Statement balance / CC debt = what you owe.
   "Available to Save" is cash minus allocated envelopes — CC debt affects net worth separately.

When recommending workflows:
- Tailor to the user's ACTUAL income profile and debt situation (see User Situation Summary)
- Give numbered steps using app feature names (Money Movement, categories, goals, etc.)
- Include relevant help page paths as markdown links, e.g. [Income Buffer guide](${HELP_LINKS.incomeBuffer})
- Do NOT assume they pay credit cards in full monthly unless their data shows zero balances
- If income is not configured, start with income setup before budgeting workflows
`.trim();
}

export function buildWorkflowPromptInstructions(): string {
  return `
WORKFLOW RECOMMENDATION MODE:
When the user asks about workflows, how to use the app, income setup, or paying down debt:
1. Use the APP WORKFLOW GUIDE and User Situation Summary above — do not give generic budgeting advice divorced from this app's features
2. Provide numbered, actionable steps referencing specific features (Money Movement, Income Buffer, debt-paydown goals, etc.)
3. Link to help documentation using relative paths in markdown, e.g. [tutorial](/help/tutorials/irregular-income)
4. Adapt to their income type (regular vs irregular vs unconfigured) and debt status (CC balances, existing categories/goals)
5. For credit card debt: assume they carry balances unless balances are zero; focus on payment categories, monthly allocation, and tracking payoff progress
`.trim();
}
