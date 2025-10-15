import { NextRequest, NextResponse } from 'next/server';
import { getAllCreditCards, createCreditCard } from '@/lib/supabase-queries';
import type { CreateCreditCardRequest } from '@/lib/types';

export async function GET() {
  try {
    const creditCards = await getAllCreditCards();
    return NextResponse.json(creditCards);
  } catch (error: any) {
    console.error('Error fetching credit cards:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch credit cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCreditCardRequest;
    const creditCard = await createCreditCard(body);
    return NextResponse.json(creditCard, { status: 201 });
  } catch (error: any) {
    console.error('Error creating credit card:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create credit card' }, { status: 500 });
  }
}
