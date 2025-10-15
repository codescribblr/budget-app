import { NextRequest, NextResponse } from 'next/server';
import { getAllPendingChecks, createPendingCheck } from '@/lib/supabase-queries';
import type { CreatePendingCheckRequest } from '@/lib/types';

export async function GET() {
  try {
    const pendingChecks = await getAllPendingChecks();
    return NextResponse.json(pendingChecks);
  } catch (error: any) {
    console.error('Error fetching pending checks:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch pending checks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePendingCheckRequest;
    const pendingCheck = await createPendingCheck(body);
    return NextResponse.json(pendingCheck, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pending check:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create pending check' }, { status: 500 });
  }
}
