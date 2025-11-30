import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateAccountRequest, CreateCategoryRequest } from '@/lib/types';

/**
 * POST /api/wizard/complete
 * Batch create accounts and categories for budget setup wizard
 */
export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { accounts = [], categories = [] } = body as {
      accounts?: CreateAccountRequest[];
      categories?: CreateCategoryRequest[];
    };

    const createdAccounts: any[] = [];
    const createdCategories: any[] = [];

    // Create accounts in batch
    if (accounts.length > 0) {
      const accountsToInsert = accounts.map((account) => ({
        user_id: user.id,
        account_id: accountId,
        name: account.name,
        balance: account.balance ?? 0,
        account_type: account.account_type ?? 'checking',
        include_in_totals: account.include_in_totals ?? true,
        sort_order: account.sort_order ?? 0,
      }));

      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .insert(accountsToInsert)
        .select();

      if (accountsError) {
        console.error('Error creating accounts:', accountsError);
        throw accountsError;
      }

      createdAccounts.push(...(accountsData || []));
    }

    // Create categories in batch
    if (categories.length > 0) {
      const categoriesToInsert = categories.map((category) => {
        const categoryType = category.category_type ?? 'monthly_expense';
        let monthlyAmount = category.monthly_amount ?? 0;
        let monthlyTarget = category.monthly_target ?? null;
        let annualTarget = category.annual_target ?? null;
        let targetBalance = category.target_balance ?? null;

        // Auto-calculate fields based on category type (same logic as createCategory)
        if (categoryType === 'monthly_expense') {
          monthlyTarget = monthlyAmount;
          annualTarget = null;
          targetBalance = null;
        } else if (categoryType === 'accumulation') {
          if (category.annual_target) {
            monthlyAmount = category.annual_target / 12;
            annualTarget = category.annual_target;
          }
          monthlyTarget = null;
          targetBalance = null;
        } else if (categoryType === 'target_balance') {
          monthlyAmount = category.monthly_amount ?? 0;
          monthlyTarget = null;
          annualTarget = null;
          targetBalance = category.target_balance ?? null;
        }

        return {
          user_id: user.id,
          account_id: accountId,
          name: category.name,
          monthly_amount: monthlyAmount,
          current_balance: category.current_balance ?? 0,
          sort_order: category.sort_order ?? 0,
          notes: category.notes ?? null,
          is_system: category.is_system ?? false,
          category_type: categoryType,
          priority: category.priority ?? 5,
          monthly_target: monthlyTarget,
          annual_target: annualTarget,
          target_balance: targetBalance,
        };
      });

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select();

      if (categoriesError) {
        console.error('Error creating categories:', categoriesError);
        throw categoriesError;
      }

      createdCategories.push(...(categoriesData || []));
    }

    return NextResponse.json({
      success: true,
      accounts: createdAccounts,
      categories: createdCategories,
      accountsCount: createdAccounts.length,
      categoriesCount: createdCategories.length,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error completing wizard:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account found' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to complete budget setup' },
      { status: 500 }
    );
  }
}

