import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/queries';

export async function GET() {
  try {
    const summary = getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}

