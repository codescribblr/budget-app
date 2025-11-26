import { NextResponse } from 'next/server';
import { getAllLoans, createLoan, getAuthenticatedUser } from '@/lib/supabase-queries';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { getActiveAccountId } from '@/lib/account-context';
import type { CreateLoanRequest } from '@/lib/types';

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }
    await requirePremiumSubscription(accountId);

    const loans = await getAllLoans();
    return NextResponse.json(loans);
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }
    await requirePremiumSubscription(accountId);

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body: CreateLoanRequest = await request.json();

    // Validate required fields
    if (!body.name || body.balance === undefined) {
      return NextResponse.json(
        { error: 'Name and balance are required' },
        { status: 400 }
      );
    }

    const loan = await createLoan({
      name: body.name,
      balance: body.balance,
      interest_rate: body.interest_rate,
      minimum_payment: body.minimum_payment,
      payment_due_date: body.payment_due_date,
      open_date: body.open_date,
      starting_balance: body.starting_balance,
      institution: body.institution,
      include_in_net_worth: body.include_in_net_worth ?? true,
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { error: 'Failed to create loan' },
      { status: 500 }
    );
  }
}

