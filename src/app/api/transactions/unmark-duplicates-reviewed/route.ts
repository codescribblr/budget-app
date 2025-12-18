import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getActiveAccountId } from '@/lib/account-context';

export async function POST(request: Request) {
  try {
    // Check write access
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { transactionIds } = await request.json();

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'No transaction IDs provided' },
        { status: 400 }
      );
    }

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Sort transaction IDs array for consistent lookup
    const sortedTransactionIds = [...transactionIds].sort((a, b) => a - b);

    // Delete review record
    const { error: deleteError } = await supabase
      .from('duplicate_group_reviews')
      .delete()
      .eq('budget_account_id', accountId)
      .eq('transaction_ids', sortedTransactionIds);

    if (deleteError) {
      console.error('Error unmarking group as reviewed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unmark group as reviewed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error unmarking duplicates as reviewed:', error);
    return NextResponse.json(
      { error: 'Failed to unmark duplicates as reviewed' },
      { status: 500 }
    );
  }
}

