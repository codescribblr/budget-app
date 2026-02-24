import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import type { IncomeStream } from '@/lib/types';

const SCENARIO_KEY = 'income_scenario_streams';

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .eq('key', SCENARIO_KEY)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data?.value) return NextResponse.json({ scenario: null });

    try {
      const scenario = JSON.parse(data.value) as IncomeStream[];
      return NextResponse.json({ scenario: Array.isArray(scenario) ? scenario : null });
    } catch {
      return NextResponse.json({ scenario: null });
    }
  } catch (error: any) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch scenario' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json();
    const { scenario } = body;

    if (!Array.isArray(scenario)) {
      return NextResponse.json({ error: 'Scenario must be an array' }, { status: 400 });
    }

    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          account_id: accountId,
          user_id: user.id,
          key: SCENARIO_KEY,
          value: JSON.stringify(scenario),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving scenario:', error);
    return NextResponse.json({ error: error.message || 'Failed to save scenario' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    await supabase
      .from('settings')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .eq('key', SCENARIO_KEY);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing scenario:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear scenario' }, { status: 500 });
  }
}
