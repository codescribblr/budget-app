import { NextRequest, NextResponse } from 'next/server';
import { updateCategoriesOrder } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';

export async function PATCH(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json();
    const { categoryOrders } = body as {
      categoryOrders: Array<{ id: number; sort_order: number }>;
    };

    if (!Array.isArray(categoryOrders)) {
      return NextResponse.json(
        { error: 'categoryOrders must be an array' },
        { status: 400 }
      );
    }

    if (categoryOrders.length === 0) {
      return NextResponse.json(
        { error: 'categoryOrders cannot be empty' },
        { status: 400 }
      );
    }

    // Validate each item has id and sort_order
    for (const item of categoryOrders) {
      if (typeof item.id !== 'number' || typeof item.sort_order !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have id and sort_order as numbers' },
          { status: 400 }
        );
      }
    }

    await updateCategoriesOrder(categoryOrders);

    return NextResponse.json({
      success: true,
      updated: categoryOrders.length,
    });
  } catch (error: any) {
    console.error('Error reordering categories:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    );
  }
}


