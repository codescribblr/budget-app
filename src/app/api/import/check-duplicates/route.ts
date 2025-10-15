import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { hashes } = await request.json();

    if (!Array.isArray(hashes) || hashes.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check which hashes already exist in imported_transactions
    const { data: existingHashes, error } = await supabase
      .from('imported_transactions')
      .select('hash')
      .in('hash', hashes);

    if (error) throw error;

    const duplicates = existingHashes?.map(row => row.hash) || [];

    return NextResponse.json({ duplicates });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}
