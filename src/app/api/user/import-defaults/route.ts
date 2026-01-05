import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkOwnerAccess } from '@/lib/api-helpers';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_CREDIT_CARDS,
  DEFAULT_SETTINGS
} from '@/lib/default-data';

/**
 * POST /api/user/import-defaults
 * 
 * Imports default categories, accounts, credit cards, and settings for the active account.
 * This gives new users a starting point for their budget.
 * Only account owners can perform this action.
 */
export async function POST() {
  try {
    // Check if user is account owner
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const { getActiveAccountId } = await import('@/lib/account-context');
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    let categoriesCount = 0;
    let accountsCount = 0;
    let cardsCount = 0;
    let settingsCount = 0;

    // Import categories
    for (const category of DEFAULT_CATEGORIES) {
      const { error } = await supabase
        .from('categories')
        .insert({
          account_id: accountId,
          name: category.name,
          monthly_amount: category.monthly_amount,
          current_balance: 0, // Start with 0 balance
          sort_order: category.sort_order,
          is_system: category.is_system,
        });

      if (error) {
        console.error('Error importing category:', error);
        throw error;
      }
      categoriesCount++;
    }

    // Import accounts
    for (const account of DEFAULT_ACCOUNTS) {
      const { error } = await supabase
        .from('accounts')
        .insert({
          account_id: accountId,
          name: account.name,
          balance: account.balance,
          account_type: account.account_type,
          include_in_totals: account.include_in_totals,
        });

      if (error) {
        console.error('Error importing account:', error);
        throw error;
      }
      accountsCount++;
    }

    // Import credit cards
    for (const card of DEFAULT_CREDIT_CARDS) {
      const currentBalance = card.credit_limit - card.available_credit;
      
      const { error } = await supabase
        .from('credit_cards')
        .insert({
          account_id: accountId,
          name: card.name,
          credit_limit: card.credit_limit,
          available_credit: card.available_credit,
          current_balance: currentBalance,
          include_in_totals: card.include_in_totals,
          sort_order: 0,
        });

      if (error) {
        console.error('Error importing credit card:', error);
        throw error;
      }
      cardsCount++;
    }

    // Import settings
    for (const setting of DEFAULT_SETTINGS) {
      const { error } = await supabase
        .from('settings')
        .insert({
          account_id: accountId,
          key: setting.key,
          value: setting.value,
        });

      if (error) {
        console.error('Error importing setting:', error);
        throw error;
      }
      settingsCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Default data imported successfully',
      counts: {
        categories: categoriesCount,
        accounts: accountsCount,
        creditCards: cardsCount,
        settings: settingsCount,
      },
    });
  } catch (error) {
    console.error('Error importing default data:', error);
    return NextResponse.json(
      { error: 'Failed to import default data' },
      { status: 500 }
    );
  }
}


