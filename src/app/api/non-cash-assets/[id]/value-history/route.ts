import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assetId = parseInt(id);
    
    if (isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Fetch all audit records for this asset, ordered by date
    const { data: auditRecords, error: auditError } = await supabase
      .from('asset_value_audit')
      .select('created_at, new_value')
      .eq('asset_id', assetId)
      .eq('budget_account_id', budgetAccountId)
      .order('created_at', { ascending: true });

    if (auditError) {
      console.error('Error fetching value history:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch value history' },
        { status: 500 }
      );
    }

    return NextResponse.json(auditRecords || []);
  } catch (error: any) {
    console.error('Error in value history endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch value history' },
      { status: 500 }
    );
  }
}
