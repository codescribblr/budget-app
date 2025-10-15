import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_CREDIT_CARDS,
  DEFAULT_SETTINGS
} from '@/lib/default-data';

/**
 * POST /api/user/import-defaults
 * 
 * Imports default categories, accounts, credit cards, and settings for the user.
 * This gives new users a starting point for their budget.
 */
export async function POST() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    let categoriesCount = 0;
    let accountsCount = 0;
    let cardsCount = 0;
    let settingsCount = 0;

    // Import categories
    for (const category of DEFAULT_CATEGORIES) {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          monthly_amount: category.monthly_amount,
          current_balance: 0, // Start with 0 balance
          sort_order: category.sort_order,
          is_system: 0,
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
          user_id: user.id,
          name: account.name,
          balance: account.balance,
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
          user_id: user.id,
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
          user_id: user.id,
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

