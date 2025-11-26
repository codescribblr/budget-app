import { NextRequest, NextResponse } from 'next/server';
import { getAllAccounts, createAccount } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateAccountRequest } from '@/lib/types';

/**
 * GET /api/accounts
 * Get all bank accounts (checking, savings, etc.) for the active budget account
 */
export async function GET() {
  try {
    const accounts = await getAllAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account found' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts
 * Create a new bank account (checking, savings, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as CreateAccountRequest;
    const account = await createAccount(body);
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account found' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    );
  }
}
