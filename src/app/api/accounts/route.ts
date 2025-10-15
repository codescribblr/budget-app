import { NextRequest, NextResponse } from 'next/server';
import { getAllAccounts, createAccount } from '@/lib/supabase-queries';
import type { CreateAccountRequest } from '@/lib/types';

export async function GET() {
  try {
    const accounts = await getAllAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAccountRequest;
    const account = await createAccount(body);
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
