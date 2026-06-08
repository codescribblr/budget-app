import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/categories/[id]/audit
 * Get audit trail for a category's balance changes
 * Query params: limit (optional, default 50), offset (optional, default 0)
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
      .select('id')
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

    // For proper sorting by transaction_date (which is in metadata JSONB),
    // we fetch batches ordered by created_at DESC (newest audit records first),
    // then sort by transaction_date within each batch
    // Newest items appear at the top for easier viewing
    const batchSize = 200; // Fetch 200 records at a time for sorting
    const batchNumber = Math.floor(offset / batchSize);
    const fetchStart = batchNumber * batchSize;
    
    const { data: auditRecords, error: auditError } = await supabase
      .from('category_balance_audit')
      .select('*')
      .eq('category_id', categoryId)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false }) // Newest audit records first
      .range(fetchStart, fetchStart + batchSize - 1);

    if (auditError) {
      console.error('Error fetching audit trail:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch audit trail' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('category_balance_audit')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('account_id', accountId);

    if (countError) {
      console.error('Error counting audit records:', countError);
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
        // Extract transaction_date from metadata for sorting
        transaction_date: record.metadata?.transaction_date || transaction?.date || record.created_at,
      };
    });

    // Sort by transaction date (descending - newest first, oldest last)
    // If transaction_date is not available, fall back to created_at
    formattedRecords.sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA; // Descending order (newest first)
      }
      // If dates are equal, use created_at as tiebreaker (newer operations first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Apply pagination within this sorted batch
    const batchOffset = offset % batchSize;
    const paginatedRecords = formattedRecords.slice(batchOffset, batchOffset + limit);
    
    // Check if there are more records beyond what we fetched in this batch
    const recordsInBatch = formattedRecords.length;
    const hasMoreInBatch = batchOffset + limit < recordsInBatch;
    const hasMoreBatches = (fetchStart + batchSize) < (count || 0);
    const hasMoreRecords = hasMoreInBatch || hasMoreBatches;

    return NextResponse.json({
      records: paginatedRecords,
      total: count || 0,
      limit,
      offset,
      hasMore: hasMoreRecords,
    });
  } catch (error: any) {
    console.error('Error in GET /api/categories/[id]/audit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
