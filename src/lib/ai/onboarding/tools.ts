import { createClient } from '@/lib/supabase/server';
import { createGoal } from '@/lib/supabase-queries';
import { getUserSubscription, isPremiumUser } from '@/lib/subscription-utils';
import type { ProposedPlan } from './types';

export interface ApplyPlanResult {
  accountsCreated: number;
  categoriesCreated: number;
  goalsCreated: number;
  settingsUpdated: boolean;
  errors: string[];
}

/**
 * Session-scoped apply of a confirmed onboarding plan.
 * Mutations only run when the client posts confirm_plan (never from raw model tool calls).
 */
export async function applyOnboardingPlan(
  userId: string,
  accountId: number,
  plan: ProposedPlan
): Promise<ApplyPlanResult> {
  const supabase = await createClient();
  const result: ApplyPlanResult = {
    accountsCreated: 0,
    categoriesCreated: 0,
    goalsCreated: 0,
    settingsUpdated: false,
    errors: [],
  };

  // Accounts
  const { data: existingAccounts } = await supabase
    .from('accounts')
    .select('name')
    .eq('account_id', accountId);

  const existingAccountNames = new Set(
    (existingAccounts || []).map((a: { name?: string }) => a.name?.toLowerCase().trim())
  );

  const accountsToInsert = (plan.accounts || [])
    .filter((a) => a.name?.trim() && !existingAccountNames.has(a.name.toLowerCase().trim()))
    .map((a, index) => ({
      user_id: userId,
      account_id: accountId,
      name: a.name.trim(),
      balance: Number(a.balance) || 0,
      account_type: a.account_type || 'checking',
      include_in_totals: true,
      sort_order: index,
    }));

  if (accountsToInsert.length > 0) {
    const { data, error } = await supabase.from('accounts').insert(accountsToInsert).select('id');
    if (error) {
      result.errors.push(`accounts: ${error.message}`);
    } else {
      result.accountsCreated = data?.length || 0;
    }
  }

  // Categories — skip names that envelope goals will create (createGoal inserts is_goal categories)
  const goalCategoryNames = new Set(
    (plan.goals || [])
      .filter((g) => (g.goal_type || 'envelope') === 'envelope')
      .map((g) => g.name.toLowerCase().trim())
  );

  const { data: existingCategories } = await supabase
    .from('categories')
    .select('name')
    .eq('account_id', accountId);

  const existingCategoryNames = new Set(
    (existingCategories || []).map((c: { name?: string }) => c.name?.toLowerCase().trim())
  );

  const categoriesToInsert = (plan.categories || [])
    .filter((c) => {
      const name = c.name?.toLowerCase().trim();
      return (
        Boolean(name) &&
        !existingCategoryNames.has(name!) &&
        !goalCategoryNames.has(name!)
      );
    })
    .map((c, index) => {
      const monthlyAmount = Math.max(0, Number(c.monthly_amount) || 0);
      return {
        user_id: userId,
        account_id: accountId,
        name: c.name.trim(),
        monthly_amount: monthlyAmount,
        current_balance: 0,
        sort_order: index,
        notes: null,
        is_system: false,
        category_type: 'monthly_expense',
        priority: 5,
        monthly_target: monthlyAmount,
        annual_target: null,
        target_balance: null,
      };
    });

  if (categoriesToInsert.length > 0) {
    const { data, error } = await supabase.from('categories').insert(categoriesToInsert).select('id');
    if (error) {
      result.errors.push(`categories: ${error.message}`);
    } else {
      result.categoriesCreated = data?.length || 0;
    }
  }

  // Settings: wizard complete + income
  const settingsToUpsert: Array<{
    account_id: number;
    user_id: string;
    key: string;
    value: string;
    updated_at: string;
  }> = [
    {
      account_id: accountId,
      user_id: userId,
      key: 'budget_wizard_completed',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      account_id: accountId,
      user_id: userId,
      key: 'ai_onboarding_completed',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      account_id: accountId,
      user_id: userId,
      key: 'habit_guide_enabled',
      value: 'true',
      updated_at: new Date().toISOString(),
    },
    {
      account_id: accountId,
      user_id: userId,
      key: 'habit_guide_started_at',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  if (plan.monthlyIncome && plan.monthlyIncome > 0) {
    const annual = plan.monthlyIncome * 12;
    const now = new Date().toISOString();
    settingsToUpsert.push(
      { account_id: accountId, user_id: userId, key: 'annual_income', value: String(annual), updated_at: now },
      { account_id: accountId, user_id: userId, key: 'annual_salary', value: String(annual), updated_at: now },
      { account_id: accountId, user_id: userId, key: 'pay_frequency', value: 'monthly', updated_at: now },
      { account_id: accountId, user_id: userId, key: 'include_extra_paychecks', value: 'true', updated_at: now }
    );
  }

  const { error: settingsError } = await supabase.from('settings').upsert(settingsToUpsert, {
    onConflict: 'user_id,key',
  });
  if (settingsError) {
    result.errors.push(`settings: ${settingsError.message}`);
  } else {
    result.settingsUpdated = true;
  }

  // Goals (premium + feature flag). Soft-fail for free accounts.
  const goals = plan.goals || [];
  if (goals.length > 0) {
    const subscription = await getUserSubscription(accountId);
    const premium = isPremiumUser(subscription);
    if (!premium) {
      result.errors.push('goals: skipped (premium required)');
    } else {
      await supabase.from('user_feature_flags').upsert(
        {
          account_id: accountId,
          feature_name: 'goals',
          enabled: true,
          enabled_at: new Date().toISOString(),
          disabled_at: null,
        },
        { onConflict: 'account_id,feature_name' }
      );

      for (const g of goals) {
        try {
          await createGoal({
            name: g.name,
            goal_type: g.goal_type || 'envelope',
            target_amount: g.target_amount,
            monthly_contribution: g.monthly_contribution ?? 0,
            notes: g.notes || null,
            starting_balance: 0,
          });
          result.goalsCreated += 1;
        } catch (err: any) {
          result.errors.push(`goal "${g.name}": ${err?.message || 'failed'}`);
        }
      }
    }
  }

  return result;
}

export async function markOnboardingSkipped(
  accountId: number,
  userId: string
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase.from('settings').upsert(
    [
      {
        account_id: accountId,
        user_id: userId,
        key: 'budget_wizard_skipped',
        value: 'true',
        updated_at: now,
      },
      {
        account_id: accountId,
        user_id: userId,
        key: 'ai_onboarding_skipped',
        value: 'true',
        updated_at: now,
      },
    ],
    { onConflict: 'user_id,key' }
  );
}
