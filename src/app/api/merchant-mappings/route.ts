import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const mappings = db.prepare(`
      SELECT 
        mm.id,
        mm.merchant_pattern,
        mm.normalized_merchant,
        mm.confidence_score,
        mm.last_used,
        c.name as category_name,
        c.id as category_id
      FROM merchant_mappings mm
      JOIN categories c ON mm.category_id = c.id
      ORDER BY mm.confidence_score DESC, mm.last_used DESC
    `).all();

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error fetching merchant mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    db.prepare('DELETE FROM merchant_mappings WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting merchant mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}

