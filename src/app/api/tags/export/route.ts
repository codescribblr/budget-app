import { NextRequest, NextResponse } from 'next/server';
import { getTags } from '@/lib/db/tags';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tags/export
 * Export tags and their transaction assignments as CSV
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const supabase = await createClient();
    const tags = await getTags();

    // Get transaction tags for all tags
    const { data: transactionTags } = await supabase
      .from('transaction_tags')
      .select('tag_id, transaction_id, transactions!inner(date, description, total_amount, budget_account_id)')
      .eq('transactions.budget_account_id', accountId)
      .in('tag_id', tags.map(t => t.id));

    // Build CSV
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Tag Name,Tag Color,Tag Description,Transaction Date,Transaction Description,Transaction Amount');

    // Data rows
    const tagMap = new Map(tags.map(t => [t.id, t]));
    (transactionTags || []).forEach((tt: any) => {
      const tag = tagMap.get(tt.tag_id);
      const transaction = tt.transactions;
      if (tag && transaction) {
        csvRows.push([
          `"${tag.name.replace(/"/g, '""')}"`,
          tag.color || '',
          `"${(tag.description || '').replace(/"/g, '""')}"`,
          transaction.date,
          `"${transaction.description.replace(/"/g, '""')}"`,
          transaction.total_amount.toString(),
        ].join(','));
      }
    });

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tags-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting tags:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to export tags' }, { status: 500 });
  }
}
