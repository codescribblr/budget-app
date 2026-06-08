import { NextResponse } from 'next/server';
import { getMerchantGroupsWithStats, createMerchantGroup } from '@/lib/db/merchant-groups';

export async function GET() {
  try {
    const groups = await getMerchantGroupsWithStats();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching merchant groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Merchant group creation is now disabled for users
  // All merchant grouping is managed by admins through global merchants
  return NextResponse.json(
    { error: 'Merchant group creation is disabled. Merchant grouping is now managed by administrators. Please contact support if you need to add a new merchant.' },
    { status: 403 }
  );
}


