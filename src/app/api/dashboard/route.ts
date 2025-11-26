import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/supabase-queries';

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}
