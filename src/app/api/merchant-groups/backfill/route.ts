import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMerchantGroupForDescription } from '@/lib/db/merchant-groups';

/**
 * Backfill merchant_group_id for existing transactions
 * This endpoint updates all transactions that have a merchant mapping but no merchant_group_id set
 */
export async function POST() {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all transactions without merchant_group_id
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, description')
      .eq('user_id', user.id)
      .is('merchant_group_id', null);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        message: 'No transactions to backfill',
        updated: 0,
      });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Look up merchant group for this description
        const merchantGroup = await getMerchantGroupForDescription(transaction.description);
        
        if (merchantGroup) {
          // Update transaction with merchant_group_id
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ merchant_group_id: merchantGroup.id })
            .eq('id', transaction.id)
            .eq('user_id', user.id);

          if (updateError) {
            console.error(`Error updating transaction ${transaction.id}:`, updateError);
            errors.push(`Transaction ${transaction.id}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error);
        errors.push(`Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Backfill complete`,
      total: transactions.length,
      updated: updatedCount,
      skipped: transactions.length - updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in backfill:', error);
    return NextResponse.json(
      { error: 'Failed to backfill merchant groups' },
      { status: 500 }
    );
  }
}


