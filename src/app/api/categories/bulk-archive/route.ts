import { NextRequest, NextResponse } from 'next/server';
import { checkWriteAccess } from '@/lib/api-helpers';
import { setCategoriesArchived } from '@/lib/supabase-queries';

export async function PATCH(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as { categoryIds: number[]; is_archived: boolean };
    const { categoryIds, is_archived } = body || {};

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ error: 'categoryIds must be a non-empty array' }, { status: 400 });
    }
    if (typeof is_archived !== 'boolean') {
      return NextResponse.json({ error: 'is_archived must be a boolean' }, { status: 400 });
    }

    const updated = await setCategoriesArchived(categoryIds, is_archived);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error bulk archiving categories:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
  }
}

