import { NextResponse } from 'next/server';
import { getMerchantGroupStats } from '@/lib/db/merchant-groups';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionIds } = body;

    const stats = await getMerchantGroupStats(transactionIds);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching merchant group stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant group stats' },
      { status: 500 }
    );
  }
}


