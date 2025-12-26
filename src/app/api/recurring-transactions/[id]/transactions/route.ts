import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/recurring-transactions/[id]/transactions
 * Get all transactions that match this recurring transaction pattern
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;

    // First verify the recurring transaction exists and user has access
    const { data: recurringTransaction, error: rtError } = await supabase
      .from('recurring_transactions')
      .select('id, transaction_type, merchant_group_id, expected_amount, amount_variance, last_occurrence_date, frequency, occurrence_count')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId)
      .single();

    if (rtError) {
      if (rtError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 });
      }
      throw rtError;
    }

    // Get all matching transaction IDs from the matches table
    const { data: matches, error: matchesError } = await supabase
      .from('recurring_transaction_matches')
      .select('transaction_id')
      .eq('recurring_transaction_id', parseInt(id));

    if (matchesError) throw matchesError;

    let transactionIds: number[] = [];

    if (matches && matches.length > 0) {
      // Use saved matches if they exist
      transactionIds = matches.map(m => m.transaction_id);
    } else {
      // Fallback: find transactions that match the pattern
      // This handles cases where matches weren't saved (e.g., older recurring transactions)
      // We'll try multiple strategies, starting with the most specific
      
      const endDate = new Date();
      const startDate = new Date();
      if (recurringTransaction.occurrence_count && recurringTransaction.frequency) {
        // Estimate lookback based on frequency and occurrence count
        const monthsPerOccurrence: Record<string, number> = {
          daily: 1/30,
          weekly: 1/4,
          biweekly: 1/2,
          monthly: 1,
          bimonthly: 2,
          quarterly: 3,
          yearly: 12,
        };
        const monthsBack = (recurringTransaction.occurrence_count * (monthsPerOccurrence[recurringTransaction.frequency] || 1)) + 1;
        startDate.setMonth(startDate.getMonth() - Math.min(monthsBack, 24)); // Cap at 2 years
      } else {
        startDate.setFullYear(startDate.getFullYear() - 2);
      }

      // Fallback: Only try to find exact matches (merchant + amount + type)
      // We don't use lenient fallbacks because they would show incorrect transactions
      // If matches weren't saved, we'll return empty and show a message in the UI
      if (recurringTransaction.merchant_group_id && recurringTransaction.expected_amount) {
        const expectedAmount = Math.abs(recurringTransaction.expected_amount);
        const variance = Math.abs(recurringTransaction.amount_variance || 0);
        // Use a tighter tolerance - only match if within variance or 3% of expected amount
        const tolerance = Math.max(variance, expectedAmount * 0.03); // 3% tolerance max
        const minAmount = Math.max(0, expectedAmount - tolerance);
        const maxAmount = expectedAmount + tolerance;

        const { data: matchingTransactions, error: matchQueryError } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('budget_account_id', accountId)
          .eq('transaction_type', recurringTransaction.transaction_type)
          .eq('merchant_group_id', recurringTransaction.merchant_group_id)
          .gte('total_amount', minAmount)
          .lte('total_amount', maxAmount)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(50);

        if (!matchQueryError && matchingTransactions && matchingTransactions.length > 0) {
          transactionIds = matchingTransactions.map(t => t.id);
        }
      }
      
      // If we still don't have matches, return empty array
      // The UI will show a message that matches weren't saved
    }

    // Fetch the actual transactions
    let transactions: any[] = [];
    
    if (transactionIds.length > 0) {
      const { data: fetchedTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          total_amount,
          transaction_type,
          description,
          merchant_group_id,
          account_id,
          credit_card_id,
          merchant_groups (
            display_name
          ),
          accounts (
            name
          ),
          credit_cards (
            name
          )
        `)
        .in('id', transactionIds)
        .eq('user_id', user.id)
        .eq('budget_account_id', accountId)
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;
      transactions = fetchedTransactions || [];
    }

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching matching transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch matching transactions' },
      { status: 500 }
    );
  }
}


