import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { hashes } = await request.json();

    if (!Array.isArray(hashes) || hashes.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }
    
    // Check which hashes already exist in imported_transactions
    const placeholders = hashes.map(() => '?').join(',');
    const query = `
      SELECT hash FROM imported_transactions
      WHERE hash IN (${placeholders})
    `;
    
    const existingHashes = db.prepare(query).all(...hashes) as { hash: string }[];
    const duplicates = existingHashes.map(row => row.hash);

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}

