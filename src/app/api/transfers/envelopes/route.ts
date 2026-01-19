import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { logBalanceChange } from '@/lib/audit/category-balance-audit';

/**
 * POST /api/transfers/envelopes
 * Transfer funds between two categories
 * Body: { fromCategoryId: number, toCategoryId: number, amount: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { fromCategoryId, toCategoryId, amount } = body;

    // Validate input
    if (!fromCategoryId || typeof fromCategoryId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid fromCategoryId' },
        { status: 400 }
      );
    }

    if (!toCategoryId || typeof toCategoryId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid toCategoryId' },
        { status: 400 }
      );
    }

    if (fromCategoryId === toCategoryId) {
      return NextResponse.json(
        { error: 'Cannot transfer to the same category' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      );
    }

    // Get both categories
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, current_balance, is_system')
      .in('id', [fromCategoryId, toCategoryId])
      .eq('account_id', accountId);

    if (categoryError) {
      console.error('Error fetching categories:', categoryError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    if (!categories || categories.length !== 2) {
      return NextResponse.json(
        { error: 'One or more categories not found' },
        { status: 404 }
      );
    }

    const fromCategory = categories.find(c => c.id === fromCategoryId);
    const toCategory = categories.find(c => c.id === toCategoryId);

    if (!fromCategory || !toCategory) {
      return NextResponse.json(
        { error: 'One or more categories not found' },
        { status: 404 }
      );
    }

    // Check if source category has sufficient balance
    if (fromCategory.current_balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance in source category' },
        { status: 400 }
      );
    }

    // Calculate new balances
    const fromOldBalance = fromCategory.current_balance;
    const fromNewBalance = fromOldBalance - amount;
    const toOldBalance = toCategory.current_balance;
    const toNewBalance = toOldBalance + amount;

    // Update both categories
    const [fromUpdate, toUpdate] = await Promise.all([
      supabase
        .from('categories')
        .update({
          current_balance: fromNewBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fromCategoryId)
        .eq('account_id', accountId),
      supabase
        .from('categories')
        .update({
          current_balance: toNewBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', toCategoryId)
        .eq('account_id', accountId),
    ]);

    if (fromUpdate.error) {
      console.error('Error updating source category:', fromUpdate.error);
      return NextResponse.json(
        { error: 'Failed to update source category' },
        { status: 500 }
      );
    }

    if (toUpdate.error) {
      console.error('Error updating destination category:', toUpdate.error);
      return NextResponse.json(
        { error: 'Failed to update destination category' },
        { status: 500 }
      );
    }

    // Log balance changes for both categories
    await Promise.all([
      logBalanceChange(
        fromCategoryId,
        fromOldBalance,
        fromNewBalance,
        'transfer_from',
        {
          transfer_category_id: toCategoryId,
          transfer_category_name: toCategory.name,
        }
      ),
      logBalanceChange(
        toCategoryId,
        toOldBalance,
        toNewBalance,
        'transfer_to',
        {
          transfer_category_id: fromCategoryId,
          transfer_category_name: fromCategory.name,
        }
      ),
    ]);

    return NextResponse.json({
      success: true,
      transfer: {
        fromCategoryId,
        toCategoryId,
        amount,
        fromNewBalance,
        toNewBalance,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/transfers/envelopes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
