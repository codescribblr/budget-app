import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET() {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('account_id', accountId);

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Convert array of settings to object
    const settingsObj: Record<string, string> = {};
    settings?.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Upsert each setting
    for (const setting of settings) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          account_id: accountId,
          user_id: user.id,
          key: setting.key,
          value: setting.value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,key',
        });

      if (error) {
        console.error('Error upserting setting:', error);
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

