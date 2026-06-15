import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/categories/[id]/audit
 * Get audit trail for a category's balance changes
 * Query params: limit (optional, default 20), offset (optional, default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Verify category exists and user has access
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, current_balance')
      .eq('id', categoryId)
      .eq('account_id', accountId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data: auditRecords, error: auditError, count } = await supabase
      .from('category_balance_audit')
      .select('*', { count: 'exact' })
      .eq('category_id', categoryId)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error('Error fetching audit trail:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch audit trail' },
        { status: 500 }
      );
    }

    // Fetch related transactions if any exist
    const transactionIds = (auditRecords || [])
      .map((r: any) => r.transaction_id)
      .filter((id: any): id is number => id !== null && id !== undefined);
    
    let transactionsMap = new Map<number, any>();
    if (transactionIds.length > 0) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, description, date, total_amount, transaction_type')
        .in('id', transactionIds)
        .eq('budget_account_id', accountId);
      
      if (transactions) {
        transactions.forEach((tx: any) => {
          transactionsMap.set(tx.id, tx);
        });
      }
    }

    // Fetch user emails using service role client
    const userIds = new Set<string>();
    (auditRecords || []).forEach((record: any) => {
      if (record.user_id) {
        userIds.add(record.user_id);
      }
    });

    const userEmailMap = new Map<string, string>();
    if (userIds.size > 0) {
      const adminSupabase = createServiceRoleClient();
      for (const userId of userIds) {
        try {
          const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
          if (!userError && userData?.user?.email) {
            userEmailMap.set(userId, userData.user.email);
          }
        } catch (err) {
          console.error(`Error fetching user ${userId}:`, err);
        }
      }
    }

    // Format the response
    const formattedRecords = (auditRecords || []).map((record: any) => {
      const transaction = record.transaction_id ? transactionsMap.get(record.transaction_id) : null;
      
      return {
        id: record.id,
        category_id: record.category_id,
        old_balance: Number(record.old_balance),
        new_balance: Number(record.new_balance),
        change_amount: Number(record.change_amount),
        change_type: record.change_type,
        transaction_id: record.transaction_id,
        transaction: transaction ? {
          id: transaction.id,
          description: transaction.description,
          date: transaction.date,
          total_amount: transaction.total_amount,
          transaction_type: transaction.transaction_type,
        } : null,
        user_id: record.user_id,
        user_email: record.user_id ? userEmailMap.get(record.user_id) || null : null,
        description: record.description,
        metadata: record.metadata,
        created_at: record.created_at,
        transaction_date: record.metadata?.transaction_date || transaction?.date || null,
      };
    });

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      records: formattedRecords,
      total,
      limit,
      offset,
      hasMore,
      current_balance: Number(category.current_balance),
    });
  } catch (error: any) {
    console.error('Error in GET /api/categories/[id]/audit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
