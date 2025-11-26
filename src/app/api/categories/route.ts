import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateCategoryRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Exclude goal categories from transaction dropdowns
    const excludeGoals = request.nextUrl.searchParams.get('excludeGoals') === 'true';
    const categories = await getAllCategories(excludeGoals);
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as CreateCategoryRequest;
    const category = await createCategory(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
