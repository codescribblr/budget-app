import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/types
 * Get all notification types
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: notificationTypes, error } = await supabase
      .from('notification_types')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ notificationTypes: notificationTypes || [] });
  } catch (error: any) {
    console.error('Error fetching notification types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification types' },
      { status: 500 }
    );
  }
}



