import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('birth_year')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Return birth_year or null if profile doesn't exist
    return NextResponse.json({
      birth_year: profile?.birth_year || null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/user/profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const body = await request.json();
    const { birth_year } = body;

    // Validate birth_year if provided
    if (birth_year !== null && birth_year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (birth_year < 1900 || birth_year > currentYear) {
        return NextResponse.json(
          { error: `Birth year must be between 1900 and ${currentYear}` },
          { status: 400 }
        );
      }
    }

    // Upsert user profile (create if doesn't exist, update if it does)
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        birth_year: birth_year || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select('birth_year')
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      birth_year: profile?.birth_year || null,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/user/profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
