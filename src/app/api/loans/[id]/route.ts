import { NextResponse } from 'next/server';
import { getLoanById, updateLoan, deleteLoan, getAuthenticatedUser } from '@/lib/supabase-queries';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import type { UpdateLoanRequest } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    await requirePremiumSubscription(user.id);

    const { id } = await params;
    const loan = await getLoanById(parseInt(id));
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
    await requirePremiumSubscription(user.id);

    const { id } = await params;
    const body: UpdateLoanRequest = await request.json();

    const loan = await updateLoan(parseInt(id), body);
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
    await requirePremiumSubscription(user.id);

    const { id } = await params;
    await deleteLoan(parseInt(id));
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

