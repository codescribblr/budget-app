import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * POST /api/merchant-recommendations
 * Create a merchant recommendation
 */
export async function POST(request: NextRequest) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { pattern, suggested_merchant_name, transaction_id } = body;

    if (!pattern || !suggested_merchant_name) {
      return NextResponse.json(
        { error: 'Pattern and suggested merchant name are required' },
        { status: 400 }
      );
    }

    // Check if recommendation already exists for this pattern
    const { data: existing } = await supabase
      .from('merchant_recommendations')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('pattern', pattern)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A pending recommendation for this pattern already exists' },
        { status: 400 }
      );
    }

    const { data: recommendation, error } = await supabase
      .from('merchant_recommendations')
      .insert({
        user_id: user.id,
        account_id: accountId,
        pattern,
        suggested_merchant_name: suggested_merchant_name.trim(),
        transaction_id: transaction_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating merchant recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to create recommendation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/merchant-recommendations
 * Get user's own recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { data: recommendations, error } = await supabase
      .from('merchant_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ recommendations: recommendations || [] });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
