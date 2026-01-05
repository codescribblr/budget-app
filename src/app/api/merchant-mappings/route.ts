import { NextResponse } from 'next/server';
import { getAllMerchantMappings, deleteMerchantMapping } from '@/lib/supabase-queries';

export async function GET() {
  try {
    const mappings = await getAllMerchantMappings();
    return NextResponse.json({ mappings });
  } catch (error: any) {
    console.error('Error fetching merchant mappings:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await request.json();
    await deleteMerchantMapping(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting merchant mapping:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}

