import { NextResponse } from 'next/server';
import { getAllCategoryRules, deleteCategoryRule } from '@/lib/merchant-category-rules';

export async function GET() {
  try {
    const rules = await getAllCategoryRules();
    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Error fetching category rules:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch category rules' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await deleteCategoryRule(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category rule:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete category rule' },
      { status: 500 }
    );
  }
}

