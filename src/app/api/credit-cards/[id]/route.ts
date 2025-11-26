import { NextRequest, NextResponse } from 'next/server';
import { getCreditCardById, updateCreditCard, deleteCreditCard } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { UpdateCreditCardRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditCardId = parseInt(id);
    
    if (isNaN(creditCardId)) {
      return NextResponse.json({ error: 'Invalid credit card ID' }, { status: 400 });
    }
    
    const creditCard = await getCreditCardById(creditCardId);

    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    return NextResponse.json(creditCard);
  } catch (error: any) {
    console.error('Error fetching credit card:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch credit card' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditCardId = parseInt(id);
    
    if (isNaN(creditCardId)) {
      return NextResponse.json({ error: 'Invalid credit card ID' }, { status: 400 });
    }
    
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as UpdateCreditCardRequest;
    const creditCard = await updateCreditCard(creditCardId, body);

    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    return NextResponse.json(creditCard);
  } catch (error: any) {
    console.error('Error updating credit card:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update credit card' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditCardId = parseInt(id);
    
    if (isNaN(creditCardId)) {
      return NextResponse.json({ error: 'Invalid credit card ID' }, { status: 400 });
    }
    
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    await deleteCreditCard(creditCardId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting credit card:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete credit card' }, { status: 500 });
  }
}
