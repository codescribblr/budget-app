import { NextRequest, NextResponse } from 'next/server';
import { getAllCreditCards, createCreditCard } from '@/lib/queries';
import type { CreateCreditCardRequest } from '@/lib/types';

export async function GET() {
  try {
    const creditCards = getAllCreditCards();
    return NextResponse.json(creditCards);
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    return NextResponse.json({ error: 'Failed to fetch credit cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCreditCardRequest;
    const creditCard = createCreditCard(body);
    return NextResponse.json(creditCard, { status: 201 });
  } catch (error) {
    console.error('Error creating credit card:', error);
    return NextResponse.json({ error: 'Failed to create credit card' }, { status: 500 });
  }
}

