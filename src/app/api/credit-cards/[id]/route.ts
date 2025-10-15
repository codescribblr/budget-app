import { NextRequest, NextResponse } from 'next/server';
import { getCreditCardById, updateCreditCard, deleteCreditCard } from '@/lib/queries';
import type { UpdateCreditCardRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditCard = getCreditCardById(parseInt(id));

    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    return NextResponse.json(creditCard);
  } catch (error) {
    console.error('Error fetching credit card:', error);
    return NextResponse.json({ error: 'Failed to fetch credit card' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateCreditCardRequest;
    const creditCard = updateCreditCard(parseInt(id), body);

    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    return NextResponse.json(creditCard);
  } catch (error) {
    console.error('Error updating credit card:', error);
    return NextResponse.json({ error: 'Failed to update credit card' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteCreditCard(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return NextResponse.json({ error: 'Failed to delete credit card' }, { status: 500 });
  }
}

