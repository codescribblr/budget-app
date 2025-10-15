import { NextRequest, NextResponse } from 'next/server';
import { getAllPendingChecks, createPendingCheck } from '@/lib/queries';
import type { CreatePendingCheckRequest } from '@/lib/types';

export async function GET() {
  try {
    const pendingChecks = getAllPendingChecks();
    return NextResponse.json(pendingChecks);
  } catch (error) {
    console.error('Error fetching pending checks:', error);
    return NextResponse.json({ error: 'Failed to fetch pending checks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePendingCheckRequest;
    const pendingCheck = createPendingCheck(body);
    return NextResponse.json(pendingCheck, { status: 201 });
  } catch (error) {
    console.error('Error creating pending check:', error);
    return NextResponse.json({ error: 'Failed to create pending check' }, { status: 500 });
  }
}

