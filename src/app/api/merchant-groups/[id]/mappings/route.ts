import { NextResponse } from 'next/server';
import { getMappingsForGroup } from '@/lib/db/merchant-groups';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const mappings = await getMappingsForGroup(groupId);
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching mappings for group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

