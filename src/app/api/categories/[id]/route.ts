import { guardedRecordUpdate, guardedDelete } from "@/lib/guarded-record-route";
import { executeEnvelopeCommand } from "@/lib/envelope-command-route";
import { NextRequest, NextResponse } from 'next/server';
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { UpdateCategoryRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }
    
    const category = await getCategoryById(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Error fetching category:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;
    
    const body = (await request.json()) as UpdateCategoryRequest;
    if ("expectedRevision" in body && "current_balance" in body && Object.keys(body).every(key => ["current_balance", "expectedRevision", "expectedBudgetId", "operationId"].includes(key))) {
      const guarded = body as UpdateCategoryRequest & { expectedRevision: string; expectedBudgetId: number; operationId: string };
      return executeEnvelopeCommand({ ...guarded, amount: guarded.current_balance, categoryId, expectedRevisions: { [categoryId]: guarded.expectedRevision } }, "set-balance");
    }
    const guarded = await guardedRecordUpdate("categories", categoryId, body);
    if (guarded) return guarded;
    const category = await updateCategory(categoryId, body);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;
    
    const guarded = await guardedDelete(request, "categories", categoryId);
    if (guarded) return guarded;
    await deleteCategory(categoryId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

