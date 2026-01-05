import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getActiveAccountId } from '@/lib/account-context';
import { createHash } from 'crypto';

function generateGroupFingerprint(transactions: Array<{ total_amount: number; date: string; description: string }>): string {
  // Normalize and combine key fields
  const normalized = transactions.map(t => ({
    amount: t.total_amount,
    date: t.date,
    description: t.description.toLowerCase().trim()
  }));
  
  // Sort by date for consistency
  normalized.sort((a, b) => a.date.localeCompare(b.date));
  
  // Create hash
  const combined = normalized.map(n => 
    `${n.amount}|${n.date}|${n.description}`
  ).join('||');
  
  return createHash('sha256').update(combined).digest('hex');
}

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

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Validate all transactions belong to user's account
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, total_amount, date, description')
      .in('id', transactionIds)
      .eq('budget_account_id', accountId);

    if (fetchError || !transactions || transactions.length !== transactionIds.length) {
      return NextResponse.json(
        { error: 'Failed to fetch transactions or unauthorized' },
        { status: 400 }
      );
    }

    // Sort transaction IDs array for consistent storage
    const sortedTransactionIds = [...transactionIds].sort((a, b) => a - b);

    // Generate fingerprint
    const fingerprint = generateGroupFingerprint(transactions);

    // Insert or update review record
    const { error: insertError } = await supabase
      .from('duplicate_group_reviews')
      .upsert({
        budget_account_id: accountId,
        transaction_ids: sortedTransactionIds,
        group_fingerprint: fingerprint,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }, {
        onConflict: 'budget_account_id,transaction_ids',
      });

    if (insertError) {
      console.error('Error marking group as reviewed:', insertError);
      return NextResponse.json(
        { error: 'Failed to mark group as reviewed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error marking duplicates as reviewed:', error);
    return NextResponse.json(
      { error: 'Failed to mark duplicates as reviewed' },
      { status: 500 }
    );
  }
}


