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
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json();
    const { display_name } = body;

    if (!display_name) {
      return NextResponse.json(
        { error: 'display_name is required' },
        { status: 400 }
      );
    }

    const group = await createMerchantGroup(display_name);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating merchant group:', error);
    return NextResponse.json(
      { error: 'Failed to create merchant group' },
      { status: 500 }
    );
  }
}


