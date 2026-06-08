import { NextRequest, NextResponse } from 'next/server';
import { getAllIncomeStreams, createIncomeStream } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateIncomeStreamRequest } from '@/lib/types';

export async function GET() {
  try {
    const streams = await getAllIncomeStreams();
    return NextResponse.json(streams);
  } catch (error: any) {
    console.error('Error fetching income streams:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch income streams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as CreateIncomeStreamRequest;
    const stream = await createIncomeStream(body);
    return NextResponse.json(stream, { status: 201 });
  } catch (error: any) {
    console.error('Error creating income stream:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create income stream' }, { status: 500 });
  }
}
