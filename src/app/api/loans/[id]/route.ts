import { NextResponse } from 'next/server';
import { getLoanById, updateLoan, deleteLoan, getAuthenticatedUser } from '@/lib/supabase-queries';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { getActiveAccountId } from '@/lib/account-context';
import type { UpdateLoanRequest } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const loanId = parseInt(id);
    
    if (isNaN(loanId)) {
      return NextResponse.json(
        { error: 'Invalid loan ID' },
        { status: 400 }
      );
    }
    
    const loan = await getLoanById(loanId);
    
    if (!loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(loan);
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error fetching loan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const loanId = parseInt(id);
    
    if (isNaN(loanId)) {
      return NextResponse.json(
        { error: 'Invalid loan ID' },
        { status: 400 }
      );
    }
    
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body: UpdateLoanRequest = await request.json();

    const loan = await updateLoan(loanId, body);
    return NextResponse.json(loan);
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { error: 'Failed to update loan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const loanId = parseInt(id);
    
    if (isNaN(loanId)) {
      return NextResponse.json(
        { error: 'Invalid loan ID' },
        { status: 400 }
      );
    }
    
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    await deleteLoan(loanId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error deleting loan:', error);
    return NextResponse.json(
      { error: 'Failed to delete loan' },
      { status: 500 }
    );
  }
}

