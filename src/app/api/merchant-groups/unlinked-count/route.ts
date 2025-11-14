import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get count of transactions without merchant_group_id
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count transactions without merchant_group_id
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('merchant_group_id', null);

    if (error) {
      console.error('Error counting unlinked transactions:', error);
      return NextResponse.json(
        { error: 'Failed to count unlinked transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: count || 0,
    });
  } catch (error) {
    console.error('Error in unlinked-count:', error);
    return NextResponse.json(
      { error: 'Failed to count unlinked transactions' },
      { status: 500 }
    );
  }
}

